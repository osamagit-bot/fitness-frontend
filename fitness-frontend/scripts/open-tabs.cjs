const { exec } = require("child_process");

setTimeout(() => {
  exec("start http://admin.localhost:3000/");
  exec("start http://member.localhost:3000/");
}, 2000); // Delay to give Vite time to start
