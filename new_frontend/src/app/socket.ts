"use client"

import { io } from "socket.io-client";

export const socket = io({autoConnect: false});

// socket.onAny((event, ...args) => {
//   "Herep"
//   console.log(event, args);
// });

export default socket;