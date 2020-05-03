
var fun = require("../models/fun");
var RoomList = require("../models/roomList");
var socketIOModule = require('socket.io');

function init(http) {
    var io = socketIOModule(http);
    bindEvent(io);
}


function bindEvent(io) {

    var onlineUsers = new Map();

    var roomList = new RoomList(onlineUsers);


    io.on('connection', function (socket) {
        var userID = socket.id;
        var userINFO = {
            id: userID,
            name: 'Unknown'
        }
        onlineUsers.set(socket, null);
        console.log("New Player：" + onlineUsers.size);
        socket.userINFO = userINFO;

     
        socket.on('disconnect', function (msg) {
            roomList.clearPlayer(socket);
            onlineUsers.delete(socket);
            console.log("User exits, remaining online users：" + onlineUsers.size);
        });

       
        socket.on("createRoom", function () {
            var roomID = roomList.createRoom();
            roomList.userEnterRoom(roomID, socket, null, function (roomID) {
    
            });
        })

 
        socket.on('updateName', function (msg) {
            socket.userINFO.name = msg.name;
    
            socket.emit("getCurrentName", {
                name: msg.name,
                date: fun.getNowDate()
            })
      
            roomList.postRoomInfoToUser(socket);
        });

     
        socket.on("leaveRoom", function (msg) {
            roomList.clearPlayer(socket, true);
        
            roomList.postRoomInfoToUser(socket);
        })

       
        socket.on("userEnterRoom", function (msg) {
            var room = msg.roomID;
            roomList.userEnterRoom(room, socket, null, function (roomID) {
      
            });
       
            roomList.postRoomInfoToUser(socket);
        })

        
        socket.on("userChangeRole", function (msg) {
            var newRole = msg.role;
            roomList.changeRole(socket, newRole);
        
            roomList.postRoomInfoToUser(socket);
        })

      
        socket.on('speakwords', function (msg) {
            if (msg.msg.length === 0) {
                return;
            }
          
            var words = socket.userINFO.name + "：" + msg.msg;
          
            var isInRoom = roomList.forEachUserSocketInRoom(socket, function (member, role) {
                member.emit("chat-words", {
                    msg: "【Room" + roomList.getTheRoomOfThisUserInIt(socket).roomID + "】" + fun.getNowTime() + " " + words
                })
            })
       
            if (!isInRoom) {
                roomList.forEachUserOutOfRoom(function (member) {
                    member.emit("chat-words", {
                        msg: "【Hall】" + fun.getNowTime() + " " + words
                    })
                })
            }
        });

        
        socket.on("restartRoom", function (msg) {
            var obj = roomList.getTheRoomOfThisUserInIt(socket);
            var role = obj.role;
            var room = obj.room;
            if (!room) {
                socket.emit("alertToUser", {
                    msg: fun.getNowTime() + " You must join the room to start a new round！"
                });
                return;
            }

     
            if (role !== 'black' && role !== 'white') {
                socket.emit("alertToUser", {
                    msg: fun.getNowTime() + "You can only play chess after becoming Black or White！"
                });
                return;
            }

      
            if (!room.player.black || !room.player.white) {
                socket.emit("alertToUser", {
                    msg: fun.getNowTime() + "You can only play chess if there are both black and white！"
                });
                return;
            }

        
            if (room.gameStatus === "doing") {
                socket.emit("alertToUser", {
                    msg: fun.getNowTime() + " The game has started！"
                });
                return;
            }

        
            room.steps = [];
            room.gameStatus = "doing";      
            roomList.postRoomInfoToUser(room, true);
        })

    
        socket.on("doNextStep", function (msg) {
            var index = msg.step;
            roomList.checkCanPutPiece(socket, index);
        })

       
        socket.emit("connection-success", {
            msg: "connection-success",
            code: "200",
            date: fun.getNowDate()
        })
    });

 
    pushRoomListInformation(io, roomList, onlineUsers);
    clearEmptyRooms(io, roomList)
    updateRoomInformationForAll(roomList);
}


function pushRoomListInformation(io, roomList, onlineUsers) {
    var delayTime = 2000;
    setInterval(function () {
        var msg = "Running time：" + fun.getNowDate();
        msg += "，Totally, " + roomList.countRoomRooms() + "Rooms，" + onlineUsers.size + "players online.";
        io.emit("broadcast", msg);
    }, delayTime);
}


function clearEmptyRooms(io, roomList) {
    var delayTime = 60000;
    setInterval(function () {
        var list = roomList.clearAllEmptyRoom();
        if (list.length > 0) {
            io.emit("alertToUser", {
                msg: "Running time：" + fun.getNowDate() + " Totally" + list.length + "room emptied," + list.join("、Rooms")
            })
        }
    }, delayTime);
}


function updateRoomInformationForAll(roomList) {
    var delayTime = 15000;
    setInterval(function () {
        roomList.postEveryRoomInfoToUser();
    }, delayTime)
}

module.exports = init;
