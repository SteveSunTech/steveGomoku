
var fun = require("../models/fun");
var roleInfo = {
    "watcher": "Audience",
    "black": "Black",
    "white": "White"
}


function RoomList(onlineUsers) {

    this.roomlist = new Map();

    this.onlineUsers = onlineUsers;
}


RoomList.prototype.createRoom = function (userSocket) {
    var isInRoom = this.onlineUsers.get(userSocket);
    if (isInRoom) {
        userSocket.emit("alertToUser", {
            msg: fun.getNowDate() + ": " + "You are already in the game and cannot create a game！"
        });
        return;
    }


    var roomID = parseInt(Math.random() * 100000);
    while (this.roomlist.has(roomID)) {
        roomID = parseInt(Math.random() * 100000);
    }
    roomID = String(roomID);

    this.roomlist.set(roomID, {
        player: {   
            black: null,  
            white: null     
        },
        watcher: new Set(),      
        ctime: (new Date()).getTime(),  
        size: 19,    
        steps: [],
        gameStatus: "original",  
        lastWinner: "",    
        roomID: roomID    
    });

    return roomID;
}

RoomList.prototype.userEnterRoom = function (roomID, userSocket, role, callback) {
  
    var currentRoom = this.onlineUsers.get(userSocket);
 
    if (currentRoom) {
        this.clearPlayer(userSocket, true);
    }

 
    var room = this.roomlist.get(roomID);
    if (!room) {
        userSocket.emit("alertToUser", {
            msg: fun.getNowDate() + ": " + "Room not exist"
        });
        return;
    }
 
    if (role && ( role === 'black' || role === 'white')) {
        if (room.player[role]) {
            userSocket.emit("alertToUser", {
                msg: fun.getNowDate() + ": " + "Player existed"
            });
            return;
        } else {
            room.player[role] = userSocket;
        }
    } else {
        role = 'watcher';
     
        room.watcher.add(userSocket);
    }

 
    this.onlineUsers.set(userSocket, {
        id: roomID,  
        role: role    
    })


    this.forEachUserSocketInRoom(room, function (member, role) {
   
        member.emit("alertToRoom", {
   
            msg: fun.getNowDate() + ": " + userSocket.userINFO.name + " Enter room" + roomID + ", player is：" + roleInfo[role]
        })
    })

    this.postRoomInfoToUser(room);
    callback && callback(roomID);
}


RoomList.prototype.clearPlayer = function (userSocket, isUserLeave) {

    var obj = this.getTheRoomOfThisUserInIt(userSocket);
    var role = obj.role;
    var room = obj.room;
    var roomID = obj.roomID;

    if (room) {
     
     
        if (role === 'watcher') {
            room.watcher.delete(userSocket);
        } else {
    
            room.player[role] = null;
        }
        if (isUserLeave) {
   
            userSocket.emit("leaveRoom", {
                msg: fun.getNowDate() + ": " + "You are leaving" + roomID
            });
        }
        this.forEachUserSocketInRoom(userSocket, function (member) {
            member.emit("alertToRoom", {
                msg: fun.getNowDate() + ": " + userSocket.userINFO.name + "Leaving" + roomID + "，Player is：" + roleInfo[role]
            })
        })
 
        this.onlineUsers.set(userSocket, null);
        return true;
    } else {
        return false;
    }
}


RoomList.prototype.clearAllEmptyRoom = function () {
    var clearRoomList = [];

    this.roomlist.forEach((value, key, roomlist) => {
            var isEmpty = true;
       
            if (value.player.white || value.player.black || value.watcher.size) {
                isEmpty = false;
            }
            if (isEmpty) {
                roomlist.delete(key);
                clearRoomList.push(key);
            }
        }
    )
    return clearRoomList;
}


RoomList.prototype.countRoomRooms = function () {
    return this.roomlist.size;
}


RoomList.prototype.getTheRoomOfThisUserInIt = function (userSocket) {
    var userInfoInRoom = this.onlineUsers.get(userSocket);
    if (!userInfoInRoom) {
        return {
            room: undefined,
            role: undefined,
            roomID: undefined
        };
    }
    var roomID = userInfoInRoom.id;
    var role = userInfoInRoom.role;
  
    var roomInfo = this.roomlist.get(roomID);
    return {
        room: roomInfo,
        role: role,
        roomID: roomID
    };
}


RoomList.prototype.changeRole = function (userSocket, role) {
   
    var obj = this.getTheRoomOfThisUserInIt(userSocket);
    var oldRole = obj.role;
    var oldRoom = obj.room;
    var oldRoomID = obj.roomID;
  
    if (!oldRoom) {
        return;
    }
  
    if (role === oldRole) {
        userSocket.emit("alertToUser", {
            msg: fun.getNowDate() + ": " + "You are" + roleInfo[role] + "."
        });
        return;
    }

 
    if (role === 'black' || role === 'white') {
        if (oldRoom.player[role]) {
            userSocket.emit("alertToUser", {
                msg: fun.getNowDate() + ": " + "User existed."
            });
            return;
        } else {
            oldRoom.player[role] = userSocket;
        }
    } else {
     
        oldRoom.watcher.add(userSocket);
    }

   
    if (oldRole === 'black' || oldRole === 'white') {
        oldRoom.player[oldRole] = null;
    } else {
        oldRoom.watcher.delete(userSocket);
    }

    this.onlineUsers.set(userSocket, {
        id: oldRoomID,  
        role: role    
    })

    userSocket.emit("alertToUser", {
        msg: fun.getNowDate() + ": " + "The character switch is successful, you are now " + roleInfo[role] + "."
    });
   
    this.forEachUserSocketInRoom(userSocket, function (member) {
        member.emit("alertToRoom", {
            msg: fun.getNowDate() + ": Room" + oldRoomID + " " + userSocket.userINFO.name + " User switched to " + roleInfo[role] + " ."
        });
    })
}


RoomList.prototype.alertToRoom = function (room, msg) {
    if (typeof room === 'number') {
        room = this.roomlist.get(room);
    }
    this.forEachUserSocketInRoom(room, function (userSocket, role) {
        userSocket.emit("alertToRoom", {
            msg: msg
        })
    })
}


RoomList.prototype.forEachUserSocketInRoom = function (base, callback) {
  
    if (base.userINFO) {
        var room = this.getTheRoomOfThisUserInIt(base).room;
        base = room;
    }
    if (!base) {
        return false;
    }

    if (base.player.black) {
        callback(base.player.black, "black");
    }
    if (base.player.white) {
        callback(base.player.white, "white");
    }
    base.watcher.forEach(function (userSocket) {
        callback(userSocket, "watcher");
    })
}


RoomList.prototype.forEachUserOutOfRoom = function (callback) {
    this.onlineUsers.forEach(function (roomInfo, userSocket) {
    
        if (roomInfo) {
            return;
        }
 
        callback(userSocket);
    })
}


RoomList.prototype.postEveryRoomInfoToUser = function () {
    var self = this;
 
    this.roomlist.forEach(function (room) {
        self.postRoomInfoToUser(room);
    })
}


RoomList.prototype.postRoomInfoToUser = function (room, isGameStart) {

    if (room.userINFO) {
        room = this.getTheRoomOfThisUserInIt(room).room;
    }
 
    if (!room) {
        return;
    }

    this.forEachUserSocketInRoom(room, function (member) {


        var watcher = Array.from(room.watcher).map(function (item) {
            return item.userINFO.name
        });
        var obj = {
            black: room.player.black ? room.player.black.userINFO.name : "",
            white: room.player.white ? room.player.white.userINFO.name : "",
            watcher: watcher,
            ctime: fun.getNowDate(room.ctime),
            size: room.size,
            steps: room.steps,
            lastWinner: room.lastWinner,    
            gameStatus: room.gameStatus,    
            roomID: room.roomID
        };
   
        if (isGameStart) {
            obj.toStartGame = true;
        }
        member.emit("getRoomInfo", obj);
    })

}


RoomList.prototype.checkCanPutPiece = function (userSocket, index) {
    if (index === -1) {
        return;
    }

    var obj = this.getTheRoomOfThisUserInIt(userSocket);
    var room = obj.room;
    var role = obj.role;
   
    if (role !== 'black' && role !== 'white') {
        userSocket.emit("alertToUser", {
            msg: fun.getNowTime() + " You can only play chess after becoming Black or White！"
        });
        return;
    }

    if (room.steps.length % 2 === 0 && role !== 'black') {
        return;
    }
    if (room.steps.length % 2 === 1 && role !== 'white') {
        return;
    }
  
    if (room.gameStatus !== 'doing') {
        userSocket.emit("alertToUser", {
            msg: fun.getNowTime() + " Game end！"
        });
        return;
    }

  
    if (!room) {
        return;
    }

   
    if (room.steps.indexOf(index) > -1) {
        userSocket.emit("alertToUser", {
            msg: fun.getNowTime() + " There are already pieces in this step, so you cannot play chess at this step！"
        });
        return;
    } else {
    
        room.steps.push(index);
        this.forEachUserSocketInRoom(userSocket, function (member) {
            member.emit("canDoNextStep", {
                step: index,     
                steps: room.steps   
            });
        })
        var winWords = this.whoIsWinner(room);
        
        if (winWords) {
            var winner = room.steps.length % 2 ? "black" : "white";
            room.gameStatus = "end";
            room.lastWinner = room.player[winner].userINFO.name;

            var watcher = Array.from(room.watcher).map(function (item) {
                return item.userINFO.name
            });
            var obj = {
                black: room.player.black ? room.player.black.userINFO.name : "",
                white: room.player.white ? room.player.white.userINFO.name : "",
                watcher: watcher,
                ctime: fun.getNowDate(room.ctime),
                size: room.size,
                steps: room.steps,
                lastWinner: room.lastWinner, 
                gameStatus: room.gameStatus,    
                roomID: room.roomID
            };

         
            obj.isGameOver = true;
            obj.winWords = winWords;

          
            this.forEachUserSocketInRoom(userSocket, function (member) {
                member.emit("getRoomInfo", obj);
            })
        }
        return;
    }
}

 
RoomList.prototype.whoIsWinner = function (room) {
 
    var index = room.steps[room.steps.length - 1];
    var rect = rectTransformation.changeIndexToXY(index, room);
 
    var Left_Right = [];
    var Top_Bottom = [];
    var TopLeft_BottomRight = [];
    var TopRight_BottomLeft = [];
  
    for (var i = -4; i < 5; i++) {
        Left_Right.push({
            x: rect.x + i,
            y: rect.y
        });
        Top_Bottom.push({
            x: rect.x,
            y: rect.y + i
        });
        TopLeft_BottomRight.push({
            x: rect.x + i,
            y: rect.y + i
        });
        TopRight_BottomLeft.push({
            x: rect.x - i,
            y: rect.y + i
        });
    }
  
    Left_Right = filter.beyondBorder(Left_Right, room);
    Top_Bottom = filter.beyondBorder(Top_Bottom, room);
    TopLeft_BottomRight = filter.beyondBorder(TopLeft_BottomRight, room);
    TopRight_BottomLeft = filter.beyondBorder(TopRight_BottomLeft, room);

   
    Left_Right = filter.filterSameColor(Left_Right, room);
    Top_Bottom = filter.filterSameColor(Top_Bottom, room);
    TopLeft_BottomRight = filter.filterSameColor(TopLeft_BottomRight, room);
    TopRight_BottomLeft = filter.filterSameColor(TopRight_BottomLeft, room);

    var haveWin = "";
    if (isWin(Left_Right)) {
        haveWin += "Left_Right Five in a Row，";
    }
    if (isWin(Top_Bottom)) {
        haveWin += "Top_Bottom Five in a Row，";
    }
    if (isWin(TopLeft_BottomRight)) {
        haveWin += "TopLeft_BottomRight Five in a Row，";
    }
    if (isWin(TopRight_BottomLeft)) {
        haveWin += "TopRight_BottomLeft Five in a Row，";
    }
    if (haveWin) {
        return haveWin
    } else {
        return false;
    }

}


function isWin(arr) {
  
    var tempArr = [];
    var overFive = false;
    arr.forEach(function (item) {
        if (item !== undefined) {
            tempArr.push(item);
        } else {
            tempArr = [];
        }
        if (tempArr.length === 5) {
            overFive = true;
        }
    })
    return overFive;
}


var rectTransformation = {
    changeIndexToXY  (index, room) {
    
        var x = index % room.size + 1;
        var y = parseInt(index / room.size) + 1;
        return {
            x, y
        }
    },
    changeXYToIndex(obj, room){
        return (obj.x - 1) + (obj.y - 1) * room.size;
    }
};


var filter = {

    beyondBorder(arr, room){
    
        return arr.map(item => {
            if (item === undefined) {
                return undefined;
            }
            if (item.x < 1 || item.y < 1 || item.x > room.size || item.y > room.size) {
                return undefined;
            } else {
                return item;
            }
        })
    },

    filterSameColor(arr, room){
  
        var isEven = (room.steps.length - 1) % 2;
        return arr.map(item => {
            if (item === undefined) {
                return undefined;
            }
            var index = rectTransformation.changeXYToIndex(item, room);
            var i = room.steps.indexOf(index);
            if (i === -1 || i % 2 !== isEven) {
            
                return undefined;
            } else {
                return item;
            }
        })
    }
};

module.exports = RoomList;