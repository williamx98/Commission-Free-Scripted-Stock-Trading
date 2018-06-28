const prompt = require('prompt')
const axios = require('axios')
var fs = require('fs')
var token;
var info;
var openPositions;
var openOrders = [];
prompt.start();

getToken();

function getToken() {
	if (fs.existsSync('token.json') === false) {
		getLogin();
	} else {
		try {
			var fileOutput = fs.readFileSync('token.json','utf8')
			token = JSON.parse(fileOutput).token;
			getAccountInfo(token, false);
		} catch (err) {
			console.log(err);
		}
	}
}

function getLogin() {
	prompt.get({
		properties: {
			username: {}, 
			password: {hidden: true}
		}
	}, function(err, result) {
		login(result.username, result.password)
	})
}

function getMFA(uname, passw) {
	prompt.get('MFA', function(err, result) {
	   	loginMFA(uname, passw, result.MFA)
	})
}

function getCommand(info) {
	prompt.get('command', function(err, result) {
		result = result.command.toLowerCase().split(' ');
		switch(result[0]) {
			case 'b':
		    case 'buy':
		    	console.log('BUYING:')
		    	buy(result);
		        break;
		    case 's':
		    case 'sell':
		        console.log('SELLING: ');
		        sell(result);
		        break;
		    case 'p':
		    case 'pos':
		    case 'Positions:': 
		    	console.log('POSITIONS:');
		    	getPositions()
		    	break;
		    case 'pop':
		    case 'popular':
		    	console.log('POPULAR: ')
		    	getPopular()
		    	break;
		    case 'i':
		    case 'info': 
		    	console.log('INFO: ');
		    	getAccountInfo(token, true);
		    	break;
		    case 'l':
		    case 'logout':
		    	logout();
		    	break;
		    case 'o':
		    case 'orders':
		    	orders()
		    	break;
		    case 'q':
		    case 'qoutes':
		    	quote(result);
		    	break;
		    case 't':
		    	test();
		    	getCommand()
		    	break;
		    case 'c':
		    case 'cancel':
		    	cancel(result);
		  		break;
		    case 'quit':
		    	return;
		    	break;
		    default:
		        console.log('Error reading command: ' + result);
		        getCommand();
		}
	})
}


var openScheme = [6, 8, 7, 7];
var openRowCharLength = openScheme.reduce((a, b) => a + b, 0)
var openDivider = Array(openRowCharLength + 1).join('-')
function orders() {
	openOrders = [];
	console.log('Open orders:');
	axios.get('https://api.robinhood.com/orders/', {headers: { Authorization: `Token ${token}`}}).then(function(response) {
		var orders = response.data.results;
		console.log(openDivider);
		printRow(openScheme, ['#', 'TICKER', 'PRICE', 'SHARES']);
		console.log(openDivider);
		getOrders(orders, 0, 0);
	})
}

function getOrders(orders, index, listIndex) {
	if (index === orders.length) {
		if (listIndex === 0) {
			console.log('none');
		}
		console.log(openDivider);
		getCommand();
		return;
	}

	var item = orders[index];
	if (item.cancel === null) {
		getOrders(orders, index + 1);
		return;
	}

	axios.get(item.instrument).then(function(instrumentResp) {
		instrumentResp = instrumentResp.data
		printRow(openScheme, ['[' + listIndex + ']', instrumentResp.symbol, Number.parseFloat(item.price).toFixed(2), Number.parseFloat(item.quantity).toFixed(2)])
		openOrders.push(orders[index]);
		getOrders(orders, index + 1, listIndex++);
	})
}


var cancelScheme = [4, 8, 7, 7];
var cancelRowCharLength = cancelScheme.reduce((a, b) => a + b, 0)
var cancelDivider = Array(cancelRowCharLength + 1).join('-')
function cancel(command) {
	if (isNaN(command[1])) {
		console.log('invalid selection');
		return;
	} 
	var index = Number.parseFloat(command[1]);
	var link = openOrders[index].cancel;
	axios.post(link, {}, {headers: { Authorization: 'Token 1ee8a81d1cb769cbdb832538b693b6cf1dcaced7'}
	}).then(function(response) {
		if (response.data.detail === null) {
			console.log(response);
		} else {
			console.log('SUCCESS!');
		}
		getCommand();
	}).catch((response) => {console.log(response), getCommand()});
	// axios.get('https://api.robinhood.com/orders/', {headers: { Authorization: `Token ${token}`}}).then(function(response) {
	// 	var orders = response.data.results;
	// 	console.log(openDivider);
	// 	printRow(openScheme, ['#', 'TICKER', 'PRICE', 'SHARES']);
	// 	console.log(openDivider);
	// 	getOrders(orders, 0, 0);
	// })
}


function buy(command) {
	if (command[1] === undefined) {
		console.log('No ticker given');
		getCommand();
	} else {
		// var buyingPower = Number.parseFloat(info.cash) + Number.parseFloat(info.unsettled_debit) + Number.parseFloat(info.uncleared_deposits) + Number.parseFloat(info.unsettled_funds);
		var ticker = command[1].toUpperCase();
		var buyPrice = command[2]
		var buyingPower = command[3]
		axios.get(`https://api.robinhood.com/instruments/?symbol=${ticker}`).then(function(response) {
				var response = response.data.results[0]
				// console.log(response);
				var data = {
				    account: info.url,
				    instrument: response.url,
				    symbol: ticker,
				    type: 'limit',
				    time_in_force: 'gtc',
				    trigger: 'stop',
				    price: buyPrice,
				    stop_price: buyPrice,
				    quantity: Math.floor(buyingPower/buyPrice),
				    side: 'buy'
				  }
				// console.log(data);
				axios.post('https://api.robinhood.com/orders/', data, {
				    headers: { Authorization: `Token ${token}`}
				  }).then(function (response) {
				  	console.log('SUCCESS! status:', response.data.state);
				  	getCommand();
				  }).catch(function (response) {
				  	console.log('ERROR: ' + response.response.data.detail)
				  	getCommand();
				  })
		})
	}
}

function quote(command) {
	if (command[1] === undefined) {
		console.log('No ticker given');
		getCommand();
	} else {
		var buyingPower = Number.parseFloat(info.cash) + Number.parseFloat(info.unsettled_debit) + Number.parseFloat(info.uncleared_deposits) + Number.parseFloat(info.unsettled_funds);
		var ticker = command[1].toUpperCase();
		axios.get(`https://api.robinhood.com/quotes/?symbols=${ticker}`).then(function(response) {
			console.log(response.data);
			getCommand();
		})
	}
}

function sell(command) {
	var validPositions = {};
	var ticker = command[1].toUpperCase();
	var sellPrice = command[2]
	var account_id = info.account_number;
	axios.get(`https://api.robinhood.com/accounts/${account_id}/positions/`,
	  {headers: { Authorization: `Token ${token}`}})
	  .then(function (response) {
	  	var openPositions = [];
	  	response.data.results.forEach(function(item, index, array) {
	  		if (Number.parseInt(item.quantity) > 0) {
	  			openPositions.push( {
	  				position: item,
	  				responseIndex: index
	  			});
	  		}
	  	})

	  	openPositions.forEach(function(it, index, array) {
	  		item = it.position;
	  		var link = item.instrument;
	  		var extra = response.data.results[it.responseIndex]
			axios.get(link).then(
				function (response) {
					response = response.data
					var tickerInfo = {
						symbol: response.symbol,
						quantity: Number.parseInt(extra.quantity),
						instrument: link
					}
				    validPositions[response.symbol] = tickerInfo;
			}).then(() => {
				var data = {
				    account: info.url,
				    instrument: validPositions[ticker].instrument,
				    symbol: ticker,
				    type: 'limit',
				    time_in_force: 'gtc',
				    trigger: 'immediate',
				    price: sellPrice,
				    quantity: validPositions[ticker].quantity,
				    side: 'sell'
				  }
				console.log('selling: ', data.quantity, ' shares of ', data.symbol);
				axios.post('https://api.robinhood.com/orders/', data, {
				    headers: { Authorization: `Token ${token}`}
				  }).then(function (response) {
				  	console.log('SUCCESS! status:', response.data.state);
				  	getCommand();
				  }).catch(function (response) {
				  	console.log(response);
				  	getCommand();
				  })
			}).catch((err) => {console.log(err);})
	  	})
	  })
}

function logout() {
	console.log('Confirm Log Out (Y/N): ')
	prompt.get('confirm', function (err, result) {
		result = result.confirm.toLowerCase();
		if (result === 'y' || result === 'yes') {
			axios.post('https://api.robinhood.com/api-token-logout/', {},
	  		{headers: { Authorization: `Token ${token}`} }).then(function() {
	  			console.log('---Logout Successful---')
	  			fs.unlinkSync('token.json') 
	  			return;
	  		}).catch((err) => {
	  			console.log(err);
	  		});
			return
		} else if (result === 'n' || result === 'no'){
			getCommand()
		}
	})
}

function login(uname, passw) {
	axios.post('https://api.robinhood.com/api-token-auth/', {
	    username: uname,
	    password: passw
	  }, {
	    headers: {'Access-Control-Allow-Origin': '*'}
	  }).then(function (response) {
	  	// console.log(response.data);
	   	if (response.data['mfa_required']) {
	   		getMFA(uname, passw);
	   	} else {
	   		saveToken(response);
	   		getAccountInfo(response.data.token, true);
	   	}
	  }).catch(function (response) {
	  	console.log('Login Error')
	    getLogin();
	  })
}

function loginMFA(uname, passw, MFA) {
	axios.post('https://api.robinhood.com/api-token-auth/', {
	    username: uname,
	    password: passw,
	    mfa_code: MFA
	  }, {
	    headers: {'Access-Control-Allow-Origin': '*'}
	  }).then(function (response) {
	  	saveToken(response);
	    getAccountInfo(response.data.token);
	  }).catch(function (response) {
	  	getMFA(uname, passw);
	  })
}

function getAccountInfo(token, print) {
	axios.get('https://api.robinhood.com/accounts/',
	  { 
	  	headers: { Authorization: `Token ${token}`}
	  }).then(function (response) {
	  	info = response.data.results[0];
	  	if (print) {
	  		console.log(info)
	  	}
	  	getCommand();
	  })
}

function saveToken(response) {
	fs.writeFile("token.json", JSON.stringify(response.data), 'utf8', function (err) {
	    if (err) {
	        return console.log(err);
	    }
	    console.log("Login Successful");
	}); 
}


var positionScheme = [8, 10, 7, 12, 12];
var positionRowCharLength = positionScheme.reduce((a, b) => a + b, 0)
var divider = Array(positionRowCharLength + 1).join('-')
function getPositions() {
	axios.get(`https://api.robinhood.com/accounts/${info.account_number}/positions/`,
	  {headers: { Authorization: `Token ${token}`}})
	  .then(function (response) {
	  	openPositions = [];
	  	response.data.results.forEach(function(item, index, array) {
	  		if (Number.parseInt(item.quantity) > 0) {
	  			openPositions.push(item);
	  		}
	  	})

	  	if (openPositions.length === 0) {
	  		return;
	  	}

	  	console.log(divider)
	  	printRow(positionScheme, ['TICKER', 'BUY AT', 'QTY', 'DATE', 'COMPANY'])
	  	console.log(divider)
	  	positionDetails(openPositions, 0);
	  })
}

function positionDetails(openPositions, index) {
	if (index === openPositions.length) {
		console.log(divider);
		getCommand();
		return;
	}

	var item = openPositions[index];
	axios.get(item.instrument).then((response) => {
		response = response.data
		var time = new Date(item.updated_at);
		var day = time.getDay();
		switch (day) {
			case 1: 
				day = 'Mon'
				break;
			case 2: 
				day = 'Tue'
				break;
			case 3: 
				day = 'Wed'
				break;
			case 4: 
				day = 'Thu'
				break;
			case 5: 
				day = 'Fri'
				break;
		}
		var split = time.toLocaleDateString().split('/');
		var date = split[0] + '/' + split[1]
		var tickerInfo = {
			symbol: response.symbol,
			buy_price: item.average_buy_price < 1 ? item.average_buy_price : Number.parseFloat(item.average_buy_price).toFixed(2),
			quantity: Number.parseInt(item.quantity),
			company: (response.simple_name).padStart(15 - response.simple_name.length),
			date: day + ' ' + date
		}
		printRow(positionScheme, [(tickerInfo.symbol), (tickerInfo.buy_price), (tickerInfo.quantity), (tickerInfo.date), (tickerInfo.company)])		
		positionDetails(openPositions, index + 1);
	})
}



var popularScheme = [22,7,12,10,10,10,10,10]
var popularRowLength = popularScheme.reduce((a, b) => a + b, 0)
var popularDivider = Array(popularRowLength + 1).join('-')
var unsorted = [];

function getPopular() {
	axios.get('https://api.robinhood.com/midlands/tags/tag/100-most-popular/')
	.then(function(response) {
		unsorted = [];
		console.log(popularDivider);
		printRow(popularScheme, ['NAME', 'TICKER', '$','A.$', 'A.S', 'B.$', 'B.S', 'PREV'])
		console.log(popularDivider);
		response.data.instruments.forEach(function(item, index, array) {
			getPopularDetails(item, index === array.length - 1)
		})
	})
}

function getPopularDetails(link, last) {
	axios.get(link)
	.then(function(response) {
		//console.log(response.data)
		var name = response.data.name;
		if (response.data.state === 'active') {
			axios.get(response.data.quote)
			.then(function(response) {
				response = response.data;
				response.name = name
				unsorted.push(response);
				if (last) {
					//console.log(unsorted)
					for (var index1 = unsorted.length - 1; index1 > 0; index1--) {
						for (var index2 = 0; index2 < index1; index2++) {
							var first = Number.parseFloat(unsorted[index2].last_trade_price)
							var second = Number.parseFloat(unsorted[index2 + 1].last_trade_price)
							if (first < second) {
								var temp = unsorted[index2]
								unsorted[index2] = unsorted[index2 + 1]
								unsorted[index2 + 1] = temp
							}
						}
					}

					unsorted.forEach(function(item, index, array) {
						var info =  [(item.name.padStart(2) + '            ').substring(0,20), item.symbol, item.last_trade_price, item.ask_price, item.ask_size, item.bid_price, item.bid_size, item.previous_close]
						printRow(popularScheme, info)
						console.log(popularDivider);
					})
					getCommand(info)
				}
			})
		}
	})
}

function test() {
	axios.get('https://api.robinhood.com/accounts/5UK30683/positions/?nonzero=true', {headers: { Authorization: `Token ${token}`}})
	.then(function(response) {
		console.log(response.data)
	}).catch((err) => {console.log(err)})
}

function printRow(positionScheme, columnInfo) {
	var string = '';
	columnInfo.forEach(function(item, index) {
		string += (item + '|').padStart(positionScheme[index]);
	})
	console.log(string)
}

function returnRow(positionScheme, columnInfo) {
	var string = '';
	columnInfo.forEach(function(item, index) {
		string += (item + '|').padStart(positionScheme[index]);
	})
	return (string)
}







