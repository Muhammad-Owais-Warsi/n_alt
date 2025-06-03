import express from "express";
import cors from "cors";
import ShortUniqueId from "short-unique-id";
import Pusher from "pusher";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let REQUEST_ID = [];
let STORE = {};
const uid = new ShortUniqueId({ length: 5 });

const pusher = new Pusher({
  appId: process.env.APPID,
  key: process.env.KEY,
  secret: process.env.SECRET,
  cluster: process.env.CLUSTER,
  useTLS: true,
});

app.get("/create", async (req, res) => {
  console.log(req.ip)
  const tunnelId = uid.rnd();

  STORE[tunnelId] = {};

  res.json({ url: `http://localhost:3000/tunnel/${tunnelId}`, id: tunnelId  ,key: process.env.KEY, cluster: process.env.CLUSTER });
});

app.use("/tunnel/:tunnelId", async (req, res) => {
  const tunnelId = req.params.tunnelId;
  
  const path = req.params.path;
  console.log(STORE)
  STORE[tunnelId][req.ip] = { res };

  pusher.trigger(`tunnel-${tunnelId}`, `request-${tunnelId}`, {
    path: path,
    requestId: req.ip,
    method: req.method,
    headers: req.headers,
    body: req.body
  })
  console.log(STORE)
  
  res.end("ok");

});

app.post('/agent-response', (req, res) => {
  const { tunnelId, requestId, statusCode, headers, body } = req.body;

  // Validate tunnelId
  if (!STORE[tunnelId]) {
    return res.sendStatus(404);
  }

  // Validate IP address
  const tunnelStore = STORE[tunnelId][requestId];
  if (!tunnelStore || !tunnelStore.res) {
    return res.sendStatus(404);
  }

  // Retrieve the stored ServerResponse object
  const clientRes = tunnelStore.res;

  // Send the response back to the browser
  clientRes.set(headers).status(statusCode).send(body);

  // Clean up (optional: only if one response per request)
  delete STORE[tunnelId][requestId];

  res.sendStatus(200);
});


app.listen(3000, () => {
  console.log("running on 3000");
});
