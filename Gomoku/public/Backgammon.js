
"use strict"

let SETTING = {
    imgSize: 39
};


let ROOMINFO = {
    black: "",
    white: "",
    watcher: [],
    ctime: "",
    size: 19,

    steps: [],
    lastWinner: "",
    gameStatus: "",    
    roomID: "",

}


let USERINFO = {
    name: "",
};


window.onload = init;

function init() {


    selector();
    let serverURL = window.location.origin;

 
    let socket = window.io.connect(serverURL);

  
    listenDomclickEvent(socket);

 
    listenSocketEvent(socket);
}


function selector() {
 
    let $OBJECT = undefined;
    if (window.$ !== "undefined") {
        $OBJECT = window.$;
    }
    window.$ = function (selector) {
        if (selector.charAt(0) === '#') {
            return document.querySelector(selector)
        } else {
            return document.querySelectorAll(selector);
        }
    }
    if ($OBJECT) {
        if (Object.assign) {
            Object.assign(window.$, $OBJECT)
        } else if (Object.setPrototypeOf) {
            Object.setPrototypeOf(window.$, $OBJECT);
        } else if (window.$.__proto__) {
            window.$.__proto__ = $OBJECT;
        } else {
            console.error("You might need to change a browser...");
        }
    }
}


function listenSocketEvent(socket) {
  
    socket.on("connection-success", function (msg) {
        $("#user-name").innerText = "Unknwon";
        if (msg.code === '200') {
  
            let name = getName();
            socket.emit('updateName', {
                name: name
            });

            let li = document.createElement("li");
            li.innerText = "System：" + msg.date + " connected！";
            li.style.color = "red";
            li.style.fontWeight = "bold";
            $("#chat-room").appendChild(li);
            $("#room-info").innerHTML = "Hall";
        }
    })

  
    socket.on("disconnect", function () {
        let li = document.createElement("li");
        li.innerText = "System：" + getNowDate() + " You are off-line！";
        li.style.color = "red";
        li.style.fontWeight = "bold";
        $("#chat-room").appendChild(li);
        $("#room-info").innerText = "Pending...";
        $("#time").innerText = "You are still off-line";

        resetRoomInfo();
    })

  
    socket.on('tipsToUser', function (msg) {
        let li = document.createElement("li");
        li.innerText = "System：" + msg.msg;
        $("#chat-room").appendChild(li);
    });
 
    socket.on('alertToUser', function (msg) {
        let li = document.createElement("li");
        li.innerText = "System：" + msg.msg;
        li.style.color = "red";
        $("#chat-room").appendChild(li);
    });

   
    socket.on("getCurrentName", function (msg) {
        USERINFO.name = msg.name;
        $("#user-name").innerText = msg.name;
    })

    
    socket.on("alertToRoom", function (msg) {
        let li = document.createElement("li");
        li.innerText = "System：" + msg.msg;
        li.style.color = "red";
        $("#chat-room").appendChild(li);
    })

  
    socket.on("leaveRoom", function (msg) {
        let li = document.createElement("li");
        li.innerText = "System：" + msg.msg;
        li.style.color = "blue";
        $("#chat-room").appendChild(li);
        $("#room-info").innerHTML = "Hall";

        resetRoomInfo();
    })


    socket.on("chat-words", function (msg) {
        let li = document.createElement("li");
        li.innerText = msg.msg;
        $("#chat-room").appendChild(li);
    })

   
    socket.on('broadcast', function (o) {
  
        $("#time").innerText = o;
    });

 
    socket.on("getRoomInfo", function (roomInfo) {
   
        if (roomInfo.toStartGame) {
            initBoard(roomInfo);
        }
   
        if (roomInfo.isGameOver) {
            GameOver(roomInfo);
        }

        let myName = USERINFO.name;
     
        $("#winner").innerText = roomInfo.lastWinner ? roomInfo.lastWinner : "【0】";
  
        $("#room-info").innerText = roomInfo.roomID;
     
        if (myName === roomInfo.black) {
            $("#player-black").innerHTML = "<span class='myName'>" + roomInfo.black + "</span>";
        } else {
         
            if (roomInfo.black) {
                $("#player-black").innerText = roomInfo.black;
            } else {
                $("#player-black").innerHTML = "<span class='alert'>【0】</span>";
            }
        }
        if (myName === roomInfo.white) {
            $("#player-white").innerHTML = "<span class='myName'>" + roomInfo.white + "</span>";
        } else {
        
            if (roomInfo.black) {
                $("#player-white").innerText = roomInfo.white;
            } else {
                $("#player-white").innerHTML = "<span class='alert'>【0】</span>";
            }
        }
        if (roomInfo.watcher.indexOf(myName) !== -1) {
            let newWatcherList = roomInfo.watcher.map(item => {
                if (item === myName) {
                    return "<span class='myName'>" + myName + "</span>"
                } else {
                    return item;
                }
            })
            $("#watcher").innerHTML = newWatcherList.join("、");
        } else {
        
            $("#watcher").innerText = roomInfo.watcher.length > 0 ? roomInfo.watcher.join("、") : "【0】";
        }
     
        $("#ctime").innerText = roomInfo.ctime;
    
        $("#board-size").innerText = roomInfo.size;

        $("#btn-changeToGameRoom").parentElement.style.display = "";
    });

 
    socket.on("canDoNextStep", function (stepInfo) {
        var index = stepInfo.step;
        var steps = stepInfo.steps;
    
        ROOMINFO.steps.push(index);

        var isError = false;
  
        if (ROOMINFO.steps.length !== stepInfo.steps.length) {
            isError = true;
            console.error("This chess sequence does not match the server, the length of this step sequence on the server side is：" + stepInfo.steps.length + "，local：" + ROOMINFO.steps.length);
        } else {
          
            steps.map(function (step, i) {
    
                if (step !== ROOMINFO.steps[i]) {
                    console.error("No" + (i + 1) + "step is wrong, it should be：" + step + "，local：" + ROOMINFO.steps[i]);
                    isError = true;
                }
            })
        }
    
        if (isError) {
            ROOMINFO.steps = stepInfo.steps;
            $("#checkerboard").innerHTML = '';
            initBoard(ROOMINFO);
     
        } else {
       
            createPiece(index, ROOMINFO.steps.length - 1);
        }
        changeColor(steps);
    })

 
    socket.on("test", function (obj) {
        console.log(obj);
    })
}


function listenDomclickEvent(socket) {
 
    $("#btn-changeToGameRoom").addEventListener("click", function () {
        if ($("#btn-changeToGameRoom").parentNode.classList.contains("btn-blue")) {
            return;
        }
        $("#btn-changeToChatRoom").parentNode.classList.remove("btn-blue");
        $("#btn-changeToGameRoom").parentNode.classList.add("btn-blue");

        $("#page-chatroom").style.display = "none";
        $("#page-gameroom").style.display = "block";
    })

 
    $("#btn-changeToChatRoom").addEventListener("click", function () {
        if ($("#btn-changeToChatRoom").parentNode.classList.contains("btn-blue")) {
            return;
        }
        $("#btn-changeToChatRoom").parentNode.classList.add("btn-blue");
        $("#btn-changeToGameRoom").parentNode.classList.remove("btn-blue");

        $("#page-chatroom").style.display = "block";
        $("#page-gameroom").style.display = "none";
    })

 
    $("#updateName-btn").addEventListener("click", function () {
   
        let name = getName();
        socket.emit('updateName', {
            name: name
        });
    })

   
    $("#words-btn").addEventListener("click", function () {
        let text = $("#words").value;
        $("#words").value = '';
        socket.emit("speakwords", {
            msg: text
        })
    })

 
    $("#words").addEventListener("keydown", function (evt) {
        if (evt.keyCode !== 13) {
            return;
        }
        let text = $("#words").value;
        $("#words").value = '';
        socket.emit("speakwords", {
            msg: text
        })
    })

  
    $("#create-room").addEventListener("click", function () {
        socket.emit("createRoom");
    })

  
    $("#enter-room").addEventListener("click", function () {
        let roomID = $("#room-id").value;
        roomID = roomID.replace(/[^0-9]/g, "");
        $("#room-id").value = roomID;
        socket.emit("userEnterRoom", {
            roomID: roomID
        })
    })

   
    $("#room-id").addEventListener("keydown", function (evt) {
        if (evt.keyCode !== 13) {
            return;
        }
        let roomID = $("#room-id").value;
        roomID = roomID.replace(/[^0-9]/g, "");
        $("#room-id").value = roomID;
        socket.emit("userEnterRoom", {
            roomID: roomID
        })
    })

   
    $("#leave-room").addEventListener("click", function () {
        socket.emit("leaveRoom");
    })

  
    $("#beBlack-btn").addEventListener("click", function () {
        socket.emit("userChangeRole", {
            role: "black"
        })
    })

  
    $("#beWhite-btn").addEventListener("click", function () {
        socket.emit("userChangeRole", {
            role: "white"
        })
    })


    $("#beWatcher-btn").addEventListener("click", function () {
        socket.emit("userChangeRole", {
            role: "watcher"
        })
    })

    $("#reset-btn").addEventListener("click", function () {
        socket.emit("restartRoom");
    });


    $("#checkerboard").addEventListener("click", function (evt) {
        checkerboardClick(evt, socket);
    });
}


function getName() {
    let familyNames = new Array(
        "赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈",
        "褚", "卫", "蒋", "沈", "韩", "杨", "朱", "秦", "尤", "许",
        "何", "吕", "施", "张", "孔", "曹", "严", "华", "金", "魏",
        "陶", "姜", "戚", "谢", "邹", "喻", "柏", "水", "窦", "章",
        "云", "苏", "潘", "葛", "奚", "范", "彭", "郎", "鲁", "韦",
        "昌", "马", "苗", "凤", "花", "方", "俞", "任", "袁", "柳",
        "酆", "鲍", "史", "唐", "费", "廉", "岑", "薛", "雷", "贺",
        "倪", "汤", "滕", "殷", "罗", "毕", "郝", "邬", "安", "常",
        "乐", "于", "时", "傅", "皮", "卞", "齐", "康", "伍", "余",
        "元", "卜", "顾", "孟", "平", "黄", "和", "穆", "萧", "尹"
    );
    let givenNames = new Array(
        "子璇", "淼", "国栋", "夫子", "瑞堂", "甜", "敏", "尚", "国贤", "贺祥", "晨涛",
        "昊轩", "易轩", "益辰", "益帆", "益冉", "瑾春", "瑾昆", "春齐", "杨", "文昊",
        "东东", "雄霖", "浩晨", "熙涵", "溶溶", "冰枫", "欣欣", "宜豪", "欣慧", "建政",
        "美欣", "淑慧", "文轩", "文杰", "欣源", "忠林", "榕润", "欣汝", "慧嘉", "新建",
        "建林", "亦菲", "林", "冰洁", "佳欣", "涵涵", "禹辰", "淳美", "泽惠", "伟洋",
        "涵越", "润丽", "翔", "淑华", "晶莹", "凌晶", "苒溪", "雨涵", "嘉怡", "佳毅",
        "子辰", "佳琪", "紫轩", "瑞辰", "昕蕊", "萌", "明远", "欣宜", "泽远", "欣怡",
        "佳怡", "佳惠", "晨茜", "晨璐", "运昊", "汝鑫", "淑君", "晶滢", "润莎", "榕汕",
        "佳钰", "佳玉", "晓庆", "一鸣", "语晨", "添池", "添昊", "雨泽", "雅晗", "雅涵",
        "清妍", "诗悦", "嘉乐", "晨涵", "天赫", "玥傲", "佳昊", "天昊", "萌萌", "若萌",
        "佳怡", "萌萌", "莹莹", "灵灵", "诺诺", "佳佳", "莎尔"
    );

    let i = parseInt(Math.random() * familyNames.length);
    if (i === familyNames.length) {
        i = familyNames.length - 1;
    }
    let familyName = familyNames[i];

    let j = parseInt(Math.random() * givenNames.length);
    if (j === givenNames.length) {
        j = givenNames.length - 1;
    }
    let givenName = givenNames[j];

    return familyName + givenName;
}


function getNowDate() {

    let formatDate = function (date) {
        return date.getFullYear() + "-" + addZero(date.getMonth() + 1, 2) + "-" + addZero(date.getDate(), 2) + " " +
            addZero(date.getHours(), 2) + ":" + addZero(date.getMinutes(), 2) + ":" + addZero(date.getSeconds(), 2);
    }
 
    let addZero = function (str, length) {
        str = String(str);
        if (typeof str !== "string" || typeof length !== "number") {
            return str;
        }
        while (str.length < length) {
            str = "0" + str;
        }
        return str;
    }

    return formatDate(new Date());
}


function initBoard(infoForServer) {

    $("#game-status").parentElement.style.display = "none";
    $("#thisOrder").parentElement.style.display = "";
    $("#thisOrder").innerHTML = "Black";
    $("#why-win").parentNode.style.display = "none";


    ROOMINFO = infoForServer;
    let size = infoForServer.size;

 
    ROOMINFO.gameover = false;


    $("#checkerboard").innerHTML = "";


    $("#checkerboard").style.width = size * SETTING.imgSize + "px";
    $("#checkerboard").style.height = size * SETTING.imgSize + "px";


    for (let i = 1; i <= size * size; i++) {
   
        if (i === 1) {
            $("#checkerboard").appendChild(createBox(["two", "left-top"], i));
        } else if (i === size) {
            $("#checkerboard").appendChild(createBox(["two", "right-top"], i));
        } else if (i === size * (size - 1) + 1) {
            $("#checkerboard").appendChild(createBox(["two", "left-bottom"], i));
        } else if (i === size * size) {
            $("#checkerboard").appendChild(createBox(["two", "right-bottom"], i));
        } else if (i < size) {
       
            $("#checkerboard").appendChild(createBox(["three", "top"], i));
        } else if (i > size && i < size * (size - 1) && i % size === 1) {
   
            $("#checkerboard").appendChild(createBox(["three", "left"], i));
        } else if (i > size && i <= size * (size - 1) && i % size === 0) {
     
            $("#checkerboard").appendChild(createBox(["three", "right"], i));
        } else if (i > size * (size - 1)) {
            $("#checkerboard").appendChild(createBox(["three", "bottom"], i));
        } else {
            $("#checkerboard").appendChild(createBox(["four"], i));
        }
    }
   
    toMakePieceWhenHasStart(infoForServer.steps);
}


function createBox(classNames, index) {
    let box = document.createElement("div");
    box.classList.add("box");
    if (classNames) {
        classNames.forEach(item => {
            box.classList.add(item);
        })
    }
    if (typeof index !== "undefined") {
        box.setAttribute("index", index);
    }
    return box;
}


function toMakePieceWhenHasStart(steps) {
    steps.forEach(function (step, index) {
        createPiece(step, index);
    })
    changeColor(steps);
}


function createPiece(step, index) {
    let piece = document.createElement("div");
    piece.classList.add("piece");

    while ($(".last-piece").length > 0) {
        $(".last-piece")[0].classList.remove("last-piece");
    }

    piece.classList.add("last-piece");
   
    if ((index + 1) % 2 === 1) {
        piece.classList.add("black");
    } else {
        piece.classList.add("white");
    }
 
    while ($(".box")[step].children.length > 0) {
        $(".box")[step].children[0].remove();
    }
    $(".box")[step].appendChild(piece);

}


function resetRoomInfo() {

    $("#btn-changeToGameRoom").parentNode.style.display = "none";
    if ($("#btn-changeToChatRoom").parentNode.classList.contains("btn-blue")) {
        return;
    }
    $("#btn-changeToChatRoom").parentNode.classList.add("btn-blue");
    $("#btn-changeToGameRoom").parentNode.classList.remove("btn-blue");

    $("#page-chatroom").style.display = "block";
    $("#page-gameroom").style.display = "none";

 
    $("#thisOrder").parentNode.style.display = "none";
    $("#game-status").parentNode.style.display = "";
    $("#checkerboard").innerHTML = "";
    $("#why-win").parentNode.style.display = "none";
}


function checkerboardClick(evt, socket) {
 
    if (ROOMINFO.gameStatus !== 'doing') {
        return;
    }
    let dom = evt.target;
  
    if (!dom.classList.contains("box")) {
        return;
    }
    let index = dom.getAttribute("index") - 1;

 
    if (checkCanPutPiece(index)) {
        socket.emit("doNextStep", {
            step: index
        })
 
    } else {
        return;
    }
}


function checkCanPutPiece(index) {

    if (ROOMINFO.steps.indexOf(index) > -1) {
        return false;
    } else {
        return true;
    }
}


function GameOver(roomInfo) {
    $("#thisOrder").parentNode.style.display = "none";
    $("#game-status").parentNode.style.display = "";
    $("#game-status").innerText = "game over";
    $("#why-win").parentNode.style.display = "";
    $("#why-win").innerText = roomInfo.winWords;

    $("#winner").parentNode.style.display = "";
    $("#winner").innerText = roomInfo.lastWinner;
}


function changeColor(steps) {
    if ((steps.length + 1) % 2 === 1) {
        $("#thisOrder").innerHTML = "<span style='background-color:white;color:black;display:inline-block;width:100%;'>Black</span>"
    } else {
        $("#thisOrder").innerHTML = "<span style='background-color:black;color:white;display:inline-block;width:100%;'>White</span>"
    }
}