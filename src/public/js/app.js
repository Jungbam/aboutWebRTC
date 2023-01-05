const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

// video
const call = document.getElementById("call");
let roomName;
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;

const getCameras = async () => {
  try {
    // 디바이스랑 카메라 가져오기 - 카메라 선택하기
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");

    // 선택된 카메라 보기
    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) option.selected = true;
      camerasSelect.appendChild(option);
    });
  } catch (error) {}
};

const getMedia = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: true,
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) await getCameras();
  } catch (e) {
    console.log(e);
  }
};

// 음소거 버튼
const handleMuteClick = () => {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
};
// 카메라 오프 버튼
const handleCameraCLick = () => {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Camera Off";
    cameraOff = false;
  } else {
    muteBtn.innerText = "Camera On";
    cameraOff = true;
  }
};

const handleCameraChange = () => {
  getMedia(camerasSelect.value);
};

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraCLick);
camerasSelect.addEventListener("change", handleCameraChange);

//welcome
const welcome = document.getElementById("welcome");

const initCall = async () => {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
};

welcomeForm = welcome.querySelector("form");

const handleWelcomSubmit = async (e) => {
  e.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  await initCall();
  socket.emit("join_room", roomName);
  input.value = "";
};
welcomeForm.addEventListener("submit", handleWelcomSubmit);

// 접속

socket.on("welcome", async () => {
  // 연결을 구성할 offer를 생성
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});
// offer를 받음.
socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});
socket.on("answer", (answer) => myPeerConnection.setRemoteDescription(answer));
//RTC
const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

const handleIce = (data) => {
  socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
  const peerFace = document.getElementById("peerFace");
  console.log(peerFace);
  peerFace.srcObject = data.stream;
};
