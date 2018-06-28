# RobinhoodShellJS
Make stock trades using the Robinhood API in the command-line. Manage and place orders quickly without going through many pages

install:
```
npm install
```
usage:
```
node command.js
```
to buy:
```
b <ticker> <price> <total cost>
```

to sell:
```
s <ticker> <price> <total cost>
```

other commands
```
i : to view info
o : to view orders
c <index> : to cancel an order. Must follow a call to orders using 'o'
p : to view current positions
l : to logout. (Delete the token.json file
quit : end the session
```
