const fs = require("node:fs");
const path = require("node:path");

const { parseAni } = require("ani-cursor/dist/parser");
const icoToPng = require("ico-to-png");

const frameRate = 1000 / 60;

const inputDir = "./input";
const outputPath = "./furina-cursor.min.css";

(async () => {
  let cssContent = "";

  await Promise.all(
    fs.readdirSync(inputDir).map(async (file) => {
      const inputPath = path.join(inputDir, file);
      const aniName = /^(.*)\./.exec(file)[1];
      const className = `cursor-furina-${aniName}`;

      const data = fs.readFileSync(inputPath);
      const ani = parseAni(new Uint8Array(data));
      const intervals = ani.rate ?? ani.images.map(() => ani.metadata.iDispRate);
      const duration = intervals.reduce((accum, interval) => {
        return accum + interval;
      }, 0);

      const frames = await Promise.all(
        ani.images.map(async (data) => {
          const pngData = await icoToPng(data, 32);
          const url = `data:image/png;base64,${pngData.toString("base64")}`;
          return { url, percentages: [] };
        })
      );

      intervals.reduce((accum, interval, i) => {
        const imageIdx = ani.seq ? ani.seq[i] : i;
        frames[imageIdx].percentages.push((accum * 100) / duration);

        return accum + interval;
      }, 0);

      const keyframes = frames
        .filter(({ percentages }) => percentages.length)
        .map(
          ({ url, percentages }) =>
            `${percentages
              .map((percentage) => percentage.toFixed(6).replace(/\.?0+$/, "") + "%")
              .join(",")}\{cursor:url("${url}"),auto\}`
        );

      cssContent += `@keyframes ${className}\{${keyframes.join("")}\}`;
      cssContent += `.${className}:hover\{animation:${className} ${(
        duration * frameRate
      ).toFixed()}ms step-end infinite;\}`;
    })
  );

  fs.writeFileSync(outputPath, cssContent);
})();
