 
var http = require('http');
var express = require('express');
var path = require('path');
var app = express();
 
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', '80');
var server = http.createServer(app);
 
server.listen(80);

 
var io = require('socket.io')(server);

 
io.on('connection', function (socket) {
    console.log("Clent has connectioned");
    var number = 0;
   
    socket.on('message', function (event) {
        console.log('Received message from client!', event);
        number++;
        socket.emit("receiveMessage", new Date() + "：Client sent messages" + number + "times");
    });
   
    socket.on('disconnect', function () {
        console.log('Clent has disconnected');
    });
});