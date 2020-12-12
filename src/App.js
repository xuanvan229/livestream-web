import React, { useState, useEffect, useRef } from "react";
import logo from './logo.svg';
import './App.css';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import html2canvas from 'html2canvas';

const client = new W3CWebSocket('wss://0.0.0.0:8086/ws');
let peerConnection;
const config = {
  iceServers: [{
    urls: [ "stun:ss-turn1.xirsys.com" ]
  }, {
      username: "QyY0Q47YJz27BWbWcMrUUfdUOHY1H4vXrds5QPoKdZljo3D3AT8a-ZSdG5hWruSvAAAAAF_UPAlEdW5nVHJhbjk3",
      credential: "fe730778-3c2b-11eb-a7c0-0242ac140004",
      urls: [
          "turn:ss-turn1.xirsys.com:80?transport=udp",
          "turn:ss-turn1.xirsys.com:3478?transport=udp",
          "turn:ss-turn1.xirsys.com:80?transport=tcp",
          "turn:ss-turn1.xirsys.com:3478?transport=tcp",
          "turns:ss-turn1.xirsys.com:443?transport=tcp",
          "turns:ss-turn1.xirsys.com:5349?transport=tcp"
      ]
  }]
  // iceServers: [
  //     {
  //       "urls": "stun:stun.l.google.com:19302",
  //     },
  //     // {
  //     //   "urls": "turn:TURN_IP?transport=tcp",
  //     //   "username": "TURN_USERNAME",
  //     //   "credential": "TURN_CREDENTIALS"
  //     // }
  // ]
};

var flag = false,
        prevX = 0,
        currX = 0,
        prevY = 0,
        currY = 0,
        dot_flag = false;

    var x = "black",
        y = 2;
function App() {
  const [response, setResponse] = useState("");
  // const [sessionId, setsessionId] = useState("");
  const sessionId = useRef('')
  const from = useRef('')
  const [list, setList] = useState([]);

  const  enableAudio = () => {
    const video = document.querySelector("video");
    console.log("Enabling audio")
    video.muted = false;
  }

  const send = () => {
    var canvas = document.querySelector('canvas');
    let base64 = canvas.toDataURL('image/jpeg', 1.0)
    console.log('base64', base64)
    base64 = base64.replace("data:image/jpeg;base64,","")
    client.send(JSON.stringify({ data: {
      'to': from.current,
      'from': 'client',
      'session_id': sessionId.current,
      'base64': base64
    },
    type: 'submitimage',}))
  }

  const capture = async () => {
		var video = document.querySelector('video');
		var canvas = document.querySelector('canvas');
		var context = canvas.getContext('2d');
		var w, h, ratio;
      ratio = video.videoWidth / video.videoHeight;

      // w = video.videoWidth - 100;
      w=500
      // h= 500
      h = parseInt(w / ratio, 10);

      canvas.width = w;
			canvas.height = h;			
			context.fillRect(0, 0, w, h);
			context.drawImage(video, 0, 0, w, h);
		// }
  };

  function draw() {
    var canvas = document.querySelector('canvas');
		var ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = x;
    ctx.lineWidth = y;
    ctx.stroke();
    ctx.closePath();
}

  function findxy(res, e) {
    var canvas = document.querySelector('canvas');
		var ctx = canvas.getContext('2d');
    if (res == 'down') {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - canvas.offsetLeft;
        currY = e.clientY - canvas.offsetTop;

        flag = true;
        dot_flag = true;
        if (dot_flag) {
            ctx.beginPath();
            ctx.fillStyle = x;
            ctx.fillRect(currX, currY, 2, 2);
            ctx.closePath();
            dot_flag = false;
        }
    }
    if (res == 'up' || res == "out") {
        flag = false;
    }
    if (res == 'move') {
        if (flag) {
            prevX = currX;
            prevY = currY;
            currX = e.clientX - canvas.offsetLeft;
            currY = e.clientY - canvas.offsetTop;
            draw();
        }
    }
}

  useEffect(() => {
    	// Get handles on the video and canvas elements
		var video = document.querySelector('video');
		var canvas = document.querySelector('canvas');
		// Get a handle on the 2d context of the canvas element
		var context = canvas.getContext('2d');
		// Define some vars required later
    var w, h, ratio;
    canvas.addEventListener("mousemove", function (e) {
      findxy('move', e)
    }, false);
    canvas.addEventListener("mousedown", function (e) {
        findxy('down', e)
    }, false);
    canvas.addEventListener("mouseup", function (e) {
        findxy('up', e)
    }, false);
    canvas.addEventListener("mouseout", function (e) {
        findxy('out', e)
    }, false);
		// Add a listener to wait for the 'loadedmetadata' state so the video's dimensions can be read
		video.addEventListener('loadedmetadata', function() {
      console.log('isten here')
			// Calculate the ratio of the video's width to height
			ratio = video.videoWidth / video.videoHeight;
			// Define the required width as 100 pixels smaller than the actual video's width
			w = video.videoWidth - 100;
			// Calculate the height based on the video's width and the ratio
			h = parseInt(w / ratio, 10);
			// Set the canvas width and height to the values just calculated
			// canvas.width = w;
			// canvas.height = h;
    }, false);
    client.onopen = () => {
      console.log('WebSocket Client Connected');
      client.send(JSON.stringify({
        data: {
          id: 'client',
          name: 'name',
          user_agent: 'user_agent',
        },
        type: 'new',
      }))
    };
    client.onmessage = (message) => {
      const data = JSON.parse(message.data)
      // console.log('message', message)

      if(data.type === 'peers') {
        setList(data.data);
      }

      if(data.type === 'offer') {
        const video = document.querySelector("video");

        peerConnection = new RTCPeerConnection(config);
        console.log('description', data)
        peerConnection
          .setRemoteDescription(data.data.description)
          .then(() => peerConnection.createAnswer())
          .then(sdp => peerConnection.setLocalDescription(sdp))
          .then(() => {
            client.send(JSON.stringify({ data: {
              'to': from.current,
              'from': 'client',
              'description': peerConnection.localDescription,
              'session_id': sessionId.current,
            },
            type: 'answer',
          }))
            // socket.emit("answer", id, peerConnection.localDescription);
          });
        peerConnection.ontrack = event => {
          video.srcObject = event.streams[0];
          console.log('event', video.srcObject)
        };
        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            console.log("===========>", {
              'to': from.current,
              'from': 'client',
              'session_id': sessionId.current,
              candidate: event.candidate,
            })
            client.send(JSON.stringify({ data: {
              'to': from.current,
              'from': 'client',
              'session_id': sessionId.current,
              candidate: event.candidate,
            },
            type: 'candidate',}))
          }
        };
      }
      if(data.type === 'candidate') {
        console.log('candidate', data.data)
        sessionId.current = data.data.session_id
        from.current = data.data.from
        // setsessionId(data.data.session_id)
        // setFrom(data.data.from)
        peerConnection
          .addIceCandidate(new RTCIceCandidate(data.data.candidate))
          .catch(e => console.error(e));
      }

      if(data.type === 'bye') {
        peerConnection.close();
      }

      // socket.on("disconnectPeer", () => {
      //   peerConnection.close();
      // });
    }
  }, []);
  return (
    <div className="App">
      <div className="left">
        <video playsInline autoPlay muted></video>
      </div>
      <div className="right">
        <button onClick={enableAudio}>
          muted
        </button>
        <button onClick={send}>Send Image</button>
        <button onClick={capture}>
          get Image
        </button>
        <canvas id="canvas" width="500" height="500"></canvas>
      </div>
    </div>
  );
}

export default App;
