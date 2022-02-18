import("fs")
  .then(({ promises }) => promises.readFile("package.json"))
  .then(JSON.parse)
  .then(({ version }) => console.log(version));
