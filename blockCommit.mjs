import chalk from 'chalk';
console.log(chalk.red("git commit会被拦截，请选择用yarn commit、npm run commit或者pnpm run commit三者中的其中一个命令进行提交"));
process.exit(1)