import parseGitCommit from "parse-git-commit";
import chalk from "chalk";
import { exec } from "child_process";
import { createRequire } from "module";
import dayjs from "dayjs";
import { readFile, writeFile } from "fs/promises";

const require = createRequire(import.meta.url);
const { version, nextVersion } = require("./package");
const { log } = console;

const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

if (version === nextVersion) {
  log(chalk.blue("不需要更新版本"));
  process.exit(1);
}

const generateNextTag = new Promise((resolve) => {
  exec(`git tag ${nextVersion}`, (err, stdout) => {
    if (err) {
      log(chalk.red("git tag发生错误"));
      console.log(err);
      resolve(false);
    } else {
      log(stdout);
      log(chalk.blue("打tag成功"));
      resolve(true);
    }
  });
});

await new Promise((resolve) => {
  exec("git tag", (err, stdout) => {
    if (err) {
      log(chalk.red("git tag发生错误"));
      resolve(false);
    } else {
      log(stdout);
      log(chalk.blue("git tag成功"));
      resolve(true);
    }
  })
})

await new Promise((resolve) => {
  exec("git log", (err, stdout) => {
    if (err) {
      log(chalk.red("git log发生错误"));
      resolve(false);
    } else {
      log(stdout);
      log(chalk.blue("git log成功"));
      resolve(true);
    }
  })
})

const isTag = await generateNextTag;

const logCollection = {
  featContent: [],
  fixContent: [],
  perfContent: [],
};

await new Promise((resolve) => {
  if (isTag) {
    const splitSymbol = `?${Math.random()}?`;
    exec(
      `git log ${version}..${nextVersion} --pretty=format:"%an${splitSymbol}%ae${splitSymbol}%ad${splitSymbol}%s${splitSymbol}%H${splitSymbol}%h" --date=short`,
      (err, stdout) => {
        if (err) {
          log(chalk.red("获取commit信息错误"));
          log(err)
          resolve();
        } else {
          const logList = stdout.split("\n");
          logList.forEach((logInfo) => {
            const [author, email, date, description, hash, shortHash] =
              logInfo.split(splitSymbol);
            try {
              const { type, scope, subject } = parseGitCommit(description);
              switch (type) {
                case "feat":
                  logCollection.featContent.push({
                    author,
                    email,
                    date,
                    scope,
                    subject,
                    hash,
                    shortHash,
                  });
                  break;
                case "fix":
                  logCollection.fixContent.push({
                    author,
                    email,
                    date,
                    scope,
                    subject,
                    hash,
                    shortHash,
                  });
                  break;
                case "refactor":
                case "perf":
                case "docs":
                case "style":
                case "test":
                case "ci":
                  logCollection.perfContent.push({
                    author,
                    email,
                    date,
                    scope,
                    subject,
                    hash,
                    shortHash,
                  });
                  break;
              }
            } catch (error) {}
          });
          resolve();
        }
      }
    );
  } else {
    resolve();
  }
});

const { featContent, fixContent, perfContent } = logCollection;
const time = dayjs.tz(dayjs(), "Asia/Shanghai").format("YYYY-MM-DD");

let markdownLog = `\n## [${nextVersion}](https://github.com/Awen-hub/git-test/compare/${version}...${nextVersion}) (${time})\n`;

if (featContent.length !== 0) {
  markdownLog += `\n### Features\n`;
}
featContent.forEach((content) => {
  const { author, date, scope, subject, hash, shortHash } = content;
  const frontContent = scope ? `* **${scope}:** ` : "*  ";
  markdownLog += `${frontContent}${subject}  @[${author}](https://github.com/${author}), ${date} ([${shortHash}](https://github.com/Awen-hub/git-test/commit/${hash}))\n`;
});

if (fixContent.length !== 0) {
  markdownLog += `\n### Bug Fixes\n`;
}
fixContent.forEach((content) => {
  const { author, date, scope, subject, hash, shortHash } = content;
  const frontContent = scope ? `* **${scope}:** ` : "*  ";
  markdownLog += `${frontContent}${subject}  @[${author}](https://github.com/${author}), ${date} ([${shortHash}](https://github.com/Awen-hub/git-test/commit/${hash}))\n`;
});

if (perfContent.length !== 0) {
  markdownLog += `\n### Perf\n`;
}
perfContent.forEach((content) => {
  const { author, date, scope, subject, hash, shortHash } = content;
  const frontContent = scope ? `* **${scope}:** ` : "*  ";
  markdownLog += `${frontContent}${subject}  @[${author}](https://github.com/${author})), ${date} ([${shortHash}](https://github.com/Awen-hub/git-test/commit/${hash}))\n`;
});

const beforeLog = await readFile("CHANGELOG.md", { encoding: "utf-8" });
const [title, befgorelogContents] = [
  beforeLog.slice(0, 16),
  beforeLog.slice(16),
];
await writeFile(
  "CHANGELOG.md",
  title + `\n` + markdownLog + befgorelogContents,
  { flag: "w+" }
);
const packageJSON = require("./package");
packageJSON.version = packageJSON.nextVersion;
await writeFile("package.json", JSON.stringify(packageJSON, null, 2));

//App更新日志
const appUpdateLog = await readFile("updateAppLog.md", "utf-8");
const [appLogTitle, beforeAppLog] = [
  appUpdateLog.slice(0, 14),
  appUpdateLog.slice(14),
];
const appLogJSON = require("./updateAppLog.json");
const { content: currentAppLogList, title: currentAppLogTitle } =
  appLogJSON.data.pop();
let currentUpdateLog = `\n## ${currentAppLogTitle}\n\n`;
currentAppLogList.forEach((content) => {
  currentUpdateLog += `* ${content}\n`;
});
await writeFile(
  "updateAppLog.md",
  appLogTitle + "\n" + currentUpdateLog + beforeAppLog,
  { flag: "w+" }
);
log(chalk.blue("日志写入成功"));
