import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";

const app = express();
const port = 3000;

interface ProcessInfo {
  PID: number;
  CreationTime: string;
  Logs: string[];
}

let processes: ProcessInfo[] = [];

app.use(bodyParser.json());
const startLogging = (processInfo: ProcessInfo) => {
  const intervalId = setInterval(() => {
    const currentTime = new Date().toLocaleString();
    processInfo.Logs.push(currentTime);
  }, 30000);

  return () => {
    clearInterval(intervalId);
  };
};

app.post("/create-process", (req: Request, res: Response) => {
  const script = spawn("node", ["dist/timeLogger.js"]); 
  const creationTime = new Date().toLocaleString();
  if (script.pid !== undefined) {
    const processInfo: ProcessInfo = {
      PID: script.pid,
      CreationTime: creationTime,
      Logs: [creationTime],
    };
    processes.push(processInfo);
    const stopLogging = startLogging(processInfo);
    script.on("close", () => {
      stopLogging();
      const index = processes.findIndex((p) => p.PID === script.pid);
      if (index !== -1) {
        processes.splice(index, 1);
      }
    });

    res.json(processInfo);
  } else {
    res.status(500).send("Failed to start the process.");
  }
});

app.get("/get-all", (req: Request, res: Response) => {
  const detailedProcesses = processes.map((process) => ({
    PID: process.PID,
    CreationTime: process.CreationTime,
  }));
  res.json(detailedProcesses);
});

app.get("/get-single/:id", (req: Request, res: Response) => {
  const pid = Number(req.params.id);
  const process = processes.find((p) => p.PID === pid);
  if (process) {
    const formattedLogs = process.Logs.map((log) => log);
    res.json({ Logs: formattedLogs });
  } else {
    res.status(404).send("Process not found.");
  }
});

app.delete("/delete-process/:id", (req: Request, res: Response) => {
  const pid = Number(req.params.id);
  const processIndex = processes.findIndex((p) => p.PID === pid);
  if (processIndex === -1) {
    res.status(404).send("Process not found.");
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
    processes[processIndex].Logs = processes[processIndex].Logs.map(
      (log) => `Finalized Log: ${log}`
    );
    processes.splice(processIndex, 1);
    res.status(200).send(`${pid} The process has been deleted successfully`);
  } catch (error) {
    res.status(500).send("Failed to terminate process.");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
