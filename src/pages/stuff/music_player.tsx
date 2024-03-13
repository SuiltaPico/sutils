import { JSX, createEffect, createSignal, on } from "solid-js";
import P5 from "p5";

type Segment = {
  start: number;
  length: number;
};

// function findProminentSegments(frequencyData: Float32Array, windowSize: number): Segment[] {
//   const segments: Segment[] = [];
//   let start = 0; // 突出信号片段的起始索引
//   let isSegment = false; // 是否正在记录一个突出的信号片段

//   // 遍历 FrequencyData
//   for (let i = 0; i < frequencyData.length; i++) {
//       // 确定当前窗口的边界
//       const windowStart = Math.max(i - windowSize, 0);
//       const windowEnd = Math.min(i + windowSize + 1, frequencyData.length);

//       // 计算窗口内的平均值和最大值
//       let sum = 0;
//       let max = -Infinity;
//       for (let j = windowStart; j < windowEnd; j++) {
//           sum += frequencyData[j];
//           if (frequencyData[j] > max) {
//               max = frequencyData[j];
//           }
//       }
//       const avg = sum / (windowEnd - windowStart);

//       // 检测当前点是否为突出信号片段的开始
//       if (frequencyData[i] > avg && frequencyData[i] === max) {
//           if (!isSegment) {
//               start = i; // 标记突出信号片段的开始
//               isSegment = true;
//           }
//       } else {
//           if (isSegment) {
//               // 当前点不属于突出信号片段，但之前记录了一个片段，现在结束该片段
//               segments.push({ start: start, length: i - start });
//               isSegment = false;
//           }
//       }
//   }

//   // 检查是否有未结束的突出信号片段
//   if (isSegment) {
//       segments.push({ start: start, length: frequencyData.length - start });
//   }

//   return segments;
// }

function findProminentSegments(
  frequencyData: Float32Array,
  windowSize: number
): Segment[] {
  const segments: Segment[] = [];
  let segmentStart = -1; // 突出信号片段的起始索引，初始化为 -1 表示未开始

  for (let i = 0; i < frequencyData.length; i++) {
    // 确定当前窗口的边界
    let windowStart = Math.max(i - windowSize, 0);
    let windowEnd = Math.min(i + windowSize + 1, frequencyData.length);
    let sum = 0;
    let max = -Infinity;

    // 计算窗口内的平均值和最大值
    for (let j = windowStart; j < windowEnd; j++) {
      sum += frequencyData[j];
      if (frequencyData[j] > max) {
        max = frequencyData[j];
      }
    }
    let avg = sum / (windowEnd - windowStart);

    // 检测当前点是否满足突出信号片段的条件
    if (frequencyData[i] > avg && frequencyData[i] === max) {
      if (segmentStart === -1) {
        // 如果当前没有记录突出信号片段，则标记开始
        segmentStart = i;
      }
      // 如果已经在记录突出信号片段，则继续，不做额外操作
    } else {
      if (segmentStart !== -1) {
        // 结束当前的突出信号片段，并记录
        segments.push({ start: segmentStart, length: i - segmentStart });
        segmentStart = -1; // 重置为表示没有正在记录的突出信号片段。
      }
    }
  }

  // 检查是否有未结束的突出信号片段
  if (segmentStart !== -1) {
    segments.push({
      start: segmentStart,
      length: frequencyData.length - segmentStart,
    });
  }

  return segments;
}

function interpolateLinearToLogScale(
  linearArray: Float32Array,
  targetSize: number
): number[] {
  // 创建一个新的数组来存储对数刻度的值
  const logScaleArray = new Array(targetSize).fill(0);

  // 频率范围
  const minFreq = 10; // 避免对数0的情况
  const maxFreq = 20000;

  // 对每个目标索引进行插值
  for (let i = 0; i < targetSize; i++) {
    // 将目标索引映射到对数刻度
    const logIndex =
      minFreq * Math.pow(maxFreq / minFreq, i / (targetSize - 1));

    // 找到对应的线性索引
    const linearIndex = (logIndex / maxFreq) * (linearArray.length - 1);

    // 线性插值
    const indexLow = Math.floor(linearIndex);
    const indexHigh = Math.ceil(linearIndex);
    const weightHigh = linearIndex - indexLow;
    const weightLow = 1 - weightHigh;

    // 确保索引在数组范围内
    if (indexLow >= 0 && indexHigh < linearArray.length) {
      // 计算插值结果
      logScaleArray[i] =
        linearArray[indexLow] * weightLow + linearArray[indexHigh] * weightHigh;
    }
  }

  return logScaleArray;
}

export const MusicPlayer = () => {
  let audio_player: any, canvas_container: any;

  const [ac, set_ac] = createSignal<AudioContext>();
  createEffect(() => {
    const _ac = ac();
    if (_ac) {
      const player_node = _ac.createMediaElementSource(audio_player);
      player_node.connect(_ac.destination);

      const fft_size = 4096 * 2;
      const analyser_node = _ac.createAnalyser();
      analyser_node.fftSize = fft_size;
      player_node.connect(analyser_node);

      const buffer_length = analyser_node.frequencyBinCount;
      const data_array = new Float32Array(buffer_length);

      const _p5 = new P5((p5: P5) => {
        let prev_x = 0;
        let prev_y = 0;
        p5.setup = () => {
          p5.resizeCanvas(innerWidth, innerHeight);
          p5.colorMode(p5.HSL, 360, 100, 100);
          p5.stroke(0, 0, 0, 0);
          window.addEventListener("resize", () => {
            p5.resizeCanvas(innerWidth, innerHeight);
          });
        };
        p5.draw = () => {
          analyser_node.getFloatFrequencyData(data_array);
          const segs = findProminentSegments(data_array, 64);
          const seg_map: Record<number, boolean> = {};
          for (let index = 0; index < segs.length; index++) {
            const seg = segs[index];
            seg_map[seg.start] = true;
          }

          // const avg_scaler = 4;
          const processed_buffer_length = buffer_length * 0.9;

          let avg = 0;
          for (let i = 0; i < processed_buffer_length; i++) {
            avg += data_array[i] + 100;
          }
          avg /= buffer_length;

          p5.fill((avg * 8) % 360, 20, Math.max(avg / 4 + 10, 0));
          p5.rect(0, 0, p5.width, p5.height);
          if (p5.frameCount % 100 === 0) {
            // console.log(interpolateLinearToLogScale(data_array, fft_size));
            // console.log(avg);
            // console.log(findProminentSegments(data_array, 64))
          }

          // const log_data_array = interpolateLinearToLogScale(data_array, fft_size / 2)
          // let posX = 0;
          for (let i = 0; i < processed_buffer_length; i++) {
            const bar_height = ((data_array[i] + 150) * p5.height) / 64 / 1.5;
            const x =
              ((Math.log(i) / Math.log(processed_buffer_length)) * 0.5 +
                (i / processed_buffer_length) * 0.5) *
              p5.width;
            const y = p5.height - bar_height / 2;
            p5.fill(
              Math.floor((data_array[i] + 150) * 6) % 360,
              80,
              // 40 + (data_array[i] + 150) / 5
              60
            );
            // p5.rect(x, y, bar_width, bar_height / 2);
            p5.stroke(
              Math.floor((data_array[i] + 150) * 6) % 360,
              80,
              // 40 + (data_array[i] + 150) / 5
              60
            );
            p5.line(prev_x, prev_y, x, y);
            prev_x = x;
            prev_y = y;
            if (seg_map[i]) {
              p5.fill(0, 0, 100);
              p5.text(
                `${((_ac.sampleRate / fft_size) * i).toFixed(0)}\n${data_array[
                  i
                ].toFixed(2)}`,
                x,
                y
              );
            }
            // posX += bar_width;
          }
        };
      }, canvas_container);
    }
  });

  const [obj_url, set_obj_url] = createSignal("");
  createEffect(
    on(obj_url, (curr, prev) => {
      try {
        if (prev) URL.revokeObjectURL(prev);
      } catch {}
    })
  );

  async function handle_file_input_change(
    e: Event & { target: HTMLInputElement }
  ) {
    if (!ac()) {
      set_ac(new AudioContext());
    }

    const input = e.target;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const new_obj_url = URL.createObjectURL(file);

    set_obj_url(new_obj_url);
  }

  return (
    <div class="flex flex-col w-full h-full relative items-center bg-neutral-200">
      <div
        class="absolute top-0 left-0 w-full h-full"
        ref={canvas_container}
      ></div>
      <div class="relative flex flex-col bg-[#fffa] backdrop-blur-[10px] p-4 rounded shadow gap-2 mt-5">
        <input type="file" onChange={handle_file_input_change}></input>
        <audio ref={audio_player} src={obj_url()} controls></audio>
      </div>
    </div>
  );
};
