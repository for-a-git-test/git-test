import compareVersions from "compare-versions";
import inquirer from "inquirer";
import { createRequire } from "module";
import chalk from "chalk";
import { writeFile } from "fs/promises";
import dayjs from "dayjs";
import { exec } from "child_process";
const require = createRequire(import.meta.url);

const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const { version: lastVersion } = require("./package");

const { log } = console;

let promptList = [
  {
    type: "list",
    message: "是否更新版本号:",
    name: "isChangeVersion",
    choices: ["Yes", "No"],
    loop: false,
  },
];

const { isChangeVersion } = await inquirer.prompt(promptList);
if (isChangeVersion === "Yes") {
  promptList = [
    {
      type: "input",
      message: `请填写新的版本号(当前版本号${lastVersion}, 版本号格式必须为x.y.z形式)：`,
      name: "versionNumber",
      validate(version) {
        if (!compareVersions.validate(version)) {
          log(chalk.red("\n版本号不规范, 请重新填写"));
          return false;
        }
        if (version.split(".").length !== 3) {
          log(chalk.red("\n版本号格式必须为x.y.z形式, 请重新填写"));
          return false;
        }
        if (compareVersions.satisfies(version, lastVersion)) {
          log(chalk.red("\n当前版本号必须大于上一个版本号, 请重新填写"));
          return false;
        }
        return true;
      },
    },
  ];
  const { versionNumber } = await inquirer.prompt(promptList);
  promptList = [
    {
      type: "input",
      message: `请填写更新日志(按一次回车键换行, 按两次回车键结束填写)：`,
      name: "logContent",
    },
  ];

  const logList = [];
  const getLog = async (resolve) => {
    const { logContent } = await inquirer.prompt(promptList);
    if (logContent !== "") {
      logList.push(logContent);
      getLog(resolve);
    } else {
      resolve();
    }
  };

  await new Promise((resolve) => {
    getLog(resolve);
  });

  const packageJSON = require("./package");
  packageJSON.nextVersion = versionNumber;
  await writeFile("package.json", JSON.stringify(packageJSON, null, 2), {
    flag: "w+",
  });

  const updateAppLogJSON = require("./updateAppLog");
  const time = dayjs.tz(dayjs(), "Asia/Shanghai").format("YYYY-MM-DD");
  updateAppLogJSON.data.push({
    content: logList,
    title: `${time} 新版本(V${versionNumber})`,
  });
  await writeFile(
    "updateAppLog.json",
    JSON.stringify(updateAppLogJSON, null, 2),
    { flag: "w+" }
  );

  await new Promise((resolve) => {
    exec("git add .", (err, stdout) => {
      log(stdout)
      resolve();
    });
  });
  
  await new Promise((resolve) => {
    exec(
      `git commit -m "misc: 修改package.json和updateAppLog.json" -n`,
      (err, stdout) => {
        if (err) {
          log(chalk.red("commit出错"))
        }
        log(stdout)
        resolve();
      }
    );
  });
}

const nowBranch = await new Promise((resolve) => {
  exec("git rev-parse --abbrev-ref HEAD", (err, stdout) => {
    resolve(stdout.replace("\n", ""));
  });
});

await new Promise((resolve) => {
  exec(`git push --set-upstream origin ${nowBranch} -n --tags`, (err, stdout) => {
    if (err) {
      log(chalk.red("push出错"));
      log(err);
    } else {
      log(chalk.blue("push成功"));
      log(stdout);
    }
    resolve();
  });
});

