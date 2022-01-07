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

const handleErr = (err, message) => {
  if (message !== "") {
    log(chalk.red(message));
  }
  log(err);
  process.exit(1);
};

const handleResolve = (stdout, message, resolve) => {
  log(chalk.blue(message));
  log(stdout);
  resolve();
};

const gitAdd = () =>
  new Promise((resolve) => {
    exec("git add .", (err, stdout) => {
      if (err) {
        handleErr(err, "git add . 执行出错");
      }
      handleResolve(stdout, "git add . 执行成功", resolve);
    });
  });

const gitCommit = () =>
  new Promise((resolve) => {
    exec(
      `git commit -m "misc: 修改package.json和AppLog.json" -n`,
      (err, stdout) => {
        if (err) {
          handleErr(err, "git commit执行出错");
        }
        handleResolve(stdout, "git add . 执行成功", resolve);
      }
    );
  });

const getBranch = () =>
  new Promise((resolve) => {
    exec("git rev-parse --abbrev-ref HEAD", (err, stdout) => {
      if (err) {
        handleErr(err, "获取当前分支名字时发生错误");
      }
      log(chalk.blue("成功获取当前分支名称"));
      resolve(stdout.replace("\n", ""));
    });
  });

const gitPush = (nowBranch) =>
  new Promise((resolve) => {
    exec(
      `git push --set-upstream origin ${nowBranch} --no-verify --tags`,
      (err, stdout) => {
        if (err) {
          handleErr(err, "git push发生错误");
        } else {
          handleResolve(stdout, "git push行成功", resolve);
        }
      }
    );
  });

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
          log(chalk.red("\n版本号不规范, 请重新填写\n"));
          return false;
        }
        if (version.split(".").length !== 3) {
          log(chalk.red("\n版本号格式必须为x.y.z形式, 请重新填写\n"));
          return false;
        }
        if (compareVersions.satisfies(version, lastVersion)) {
          log(chalk.red("\n当前版本号必须大于上一个版本号, 请重新填写\n"));
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
      message: `请填写更新日志(按一次回车键换行, 连续按两次回车键结束填写)：`,
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

  const AppLog = require("./AppLog");
  const time = dayjs.tz(dayjs(), "Asia/Shanghai").format("YYYY-MM-DD");
  AppLog.data.push({
    content: logList,
    title: `${time} 新版本(V${versionNumber})`,
  });
  await writeFile("AppLog.json", JSON.stringify(AppLog, null, 2), {
    flag: "w+",
  });

  await gitAdd();

  await gitCommit();
}

const nowBranch = await getBranch();

await gitPush(nowBranch);
