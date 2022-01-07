import inquirer from "inquirer";
import chalk from 'chalk';
import { exec } from 'child_process'
const { log } = console

const promptList = [
  {
    type: "list",
    message: `请选择一种coomit提交类型:
      feat:      添加新功能,
      fix:       修复bug,
      refactor:  代码重构,
      chore:     改变构建流程，新增依赖库、工具、构造工具的或者外部依赖的改动,
      docs:      只改动了文档相关的内容,
      style:     不影响代码含义的改动，例如去掉空格、改变缩进、增删分号,
      perf:      提高性能的改动,
      test:      添加测试或者修改现有测试,
      ci:        自动化流程配置修改,
      misc:      不属于以上任何一个分类
    `,
    name: "type",
    choices: [
      "feat",
      "fix",
      "refactor",
      "chore",
      "docs",
      "style",
      "perf",
      "test",
      "ci",
      "misc"
    ],
    pageSize: 14,
    loop: false,
  },
  {
    type: "input",
    message: "填写本次commit的影响范围(填写主要受影响的页面或组件等, 可选):",
    name: "scope",
  },
  {
    type: "input",
    message: "填写本次commit内容的简要说明(必填):",
    name: "subject",
    validate(val) {
      if (val === "") {
        log(chalk.red("\n此项为必填项\n"));
        return false;
      }
      if (val.length >= 50) {
        log(chalk.red("\n提交说明应尽量简短，不能超过50个字符\n"));
        return false
      }
      return true;
    },
  },
];

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

const gitCommit = (type, scope, subject) =>
  new Promise((resolve) => {
    exec(
      `git commit -m "${type}${scope}: ${subject}" -n`,
      (err, stdout) => {
        if (err) {
          handleErr(err, "git commit执行出错");
        }
        handleResolve(stdout, "git commit执行成功", resolve);
      }
    );
  });

const { type, scope, subject } = await inquirer.prompt(promptList)

await gitAdd()

await gitCommit(type, scope, subject)