import chalk from 'chalk';
console.log(chalk.red("git push会被拦截，请选择用yarn push、npm run push或者pnpm run push三者中的其中一个命令进行提交"));
process.exit(1)