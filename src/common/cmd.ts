export function parse_command_string(command: string) {
  const argv = [];
  let currentArg = "";
  let inQuotes = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (char === " " && !inQuotes) {
      if (currentArg) {
        argv.push(currentArg);
        currentArg = "";
      }
    } else if (char === '"' || char === "'") {
      if (inQuotes && command[i - 1] === "\\") {
        currentArg = currentArg.slice(0, -1) + char;
      } else {
        inQuotes = !inQuotes;
      }
    } else {
      currentArg += char;
    }
  }

  if (currentArg) {
    argv.push(currentArg);
  }

  return argv;
}
