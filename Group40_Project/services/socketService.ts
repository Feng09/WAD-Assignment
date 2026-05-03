import { io } from "socket.io-client";
import { BASE_URL } from "./productCloudService";

export const socket = io(BASE_URL, {
  transports: ["websocket"],
  autoConnect: true,
});