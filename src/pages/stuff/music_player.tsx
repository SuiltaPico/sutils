import { For, JSX, createEffect, createSignal, on, untrack } from "solid-js";
import type P5 from "p5";

type Segment = {
  start: number;
  length: number;
};

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

const fft_sizes = [512, 1024, 2048, 4096, 8192, 16384, 32768];

export const MusicPlayer = () => {
  let audio_player: any, canvas_container: any;

  const [ac, set_ac] = createSignal<AudioContext>();
  const [analyser_node, set_analyser_node] = createSignal<AnalyserNode>();
  const [fft_size, set_fft_size] = createSignal(2048);
  const [log_or_linear, set_log_or_linear] = createSignal(0);
  const [alpha, set_alpha] = createSignal(1);
  const [an_smoothing, set_an_smoothing] = createSignal(0.5);
  const [detect_local_max, set_detect_local_max] = createSignal(false);
  const [detect_local_max_size, set_detect_local_max_size] = createSignal(3);
  createEffect(() => {
    const an = analyser_node();
    if (!an) return;

    an.smoothingTimeConstant = an_smoothing();
  });

  createEffect(() => {
    const an = analyser_node();
    if (an) {
      an.fftSize = fft_size();
    }
  });

  createEffect(async () => {
    const _ac = ac();

    const p5_esm = await import("p5");
    const P5 = p5_esm.default;

    if (_ac) {
      const player_node = _ac.createMediaElementSource(audio_player);

      player_node.connect(_ac.destination);

      const _analyser_node = _ac.createAnalyser();
      _analyser_node.fftSize = untrack(() => fft_size()) as number;
      _analyser_node.smoothingTimeConstant = an_smoothing();
      player_node.connect(_analyser_node);
      set_analyser_node(_analyser_node);

      const data_array = new Float32Array(32768);

      let main_canvas: P5.Renderer;
      let font;

      const _p5 = new P5((p5: P5) => {
        let prev_x = 0;
        let prev_y = 0;
        p5.setup = () => {
          // main_canvas = p5.createCanvas(innerWidth, innerHeight, "webgl");
          main_canvas = p5.createCanvas(innerWidth, innerHeight);
          p5.colorMode(p5.HSL, 360, 100, 100);
          p5.stroke(0, 0, 0, 0);
          p5.strokeWeight(1);
          window.addEventListener("resize", () => {
            p5.resizeCanvas(innerWidth, innerHeight);
          });
          // font = p5.loadFont("/fonts/noto/NotoSans-Regular.ttf");
          // p5.textFont(font)
          p5.disableFriendlyErrors = true;
        };
        p5.draw = () => {
          let segs: Segment[];
          const seg_map: Record<number, boolean> = {};

          const start_draw = performance.now();

          _analyser_node.getFloatFrequencyData(data_array);
          if (detect_local_max()) {
            segs = findProminentSegments(
              data_array,
              (2 ** detect_local_max_size() * fft_size()) / 256
            );
            for (let index = 0; index < segs.length; index++) {
              const seg = segs[index];
              seg_map[seg.start] = true;
            }
          }

          const _fft_size = untrack(() => fft_size());
          const buffer_length = _fft_size / 2;

          // const avg_scaler = 4;
          const processed_buffer_length = buffer_length * 0.9;

          // let avg = 0;
          // for (let i = 0; i < processed_buffer_length; i++) {
          //   avg += data_array[i] + 100;
          // }
          // avg /= buffer_length;

          // if (p5.frameCount % 5 === 0) {
          // const data = p5.drawingContext.getImageData(
          //   0,
          //   0,
          //   p5.width * p5.pixelDensity(),
          //   p5.height * p5.pixelDensity()
          // );
          // p5.drawingContext.drawImage(
          //   main_canvas.elt,
          //   0,
          //   0,
          //   p5.width * p5.pixelDensity(),
          //   p5.height * p5.pixelDensity(),
          //   p5.width * 0.0025,
          //   p5.height * 0.0005,
          //   p5.width * 0.996,
          //   p5.height * 0.996
          // );

          // p5.translate(-p5.width / 2, -p5.height / 2);
          p5.stroke(0);
          p5.fill(
            // (avg * 8) % 360,
            0,
            // 20,
            0,
            // Math.max(avg / 4 + 10, 0)
            0,
            alpha()
          );
          p5.rect(0, 0, p5.width, p5.height);
          if (p5.frameCount % 100 === 0) {
            console.log(p5.frameRate());
            // console.log(_fft_size);
            // console.log(p5.drawingContext);
            // console.log(interpolateLinearToLogScale(data_array, fft_size));
            // console.log(avg);
            // console.log(findProminentSegments(data_array, 64))
          }

          // p5.translate(p5.width / 2, p5.height / 2);
          // p5.rotate(p5.frameCount / 360);
          // p5.translate(0, 0);

          // const log_data_array = interpolateLinearToLogScale(data_array, fft_size / 2)
          // let posX = 0;
          // p5.beginShape();
          for (let i = 0; i < processed_buffer_length; i++) {
            const bar_height = ((data_array[i] + 150) * p5.height) / 64 / 1.5;
            const x =
              ((Math.log(i) / Math.log(processed_buffer_length)) *
                (1 - log_or_linear()) +
                (i / processed_buffer_length) * log_or_linear()) *
              // (i / processed_buffer_length) *
              p5.width;
            const y = p5.height - bar_height / 2;

            // p5.vertex(x, y);

            // p5.fill(Math.floor((data_array[i] + 150) * 6) % 360, 80, 60);
            p5.stroke(Math.floor((data_array[i] + 150) * 6) % 360, 80, 60);
            p5.line(prev_x, prev_y, x, y);
            prev_x = x;
            prev_y = y;

            if (seg_map[i]) {
              p5.fill(0, 0, 100);
              p5.circle(x, y, 5);
              p5.text(
                `${((_ac.sampleRate / _fft_size) * i).toFixed(0)}\n${data_array[
                  i
                ].toFixed(2)}`,
                x,
                y
              );
            }
          }
          // p5.endShape();
          const end_draw = performance.now();

          p5.fill(0);
          p5.stroke(0);
          p5.rect(0, 0, 100, 48);
          p5.fill(255);
          p5.text(`FPS: ${p5.frameRate().toFixed(2)}`, 0, 24);
          p5.text(`Delay: ${(end_draw - start_draw).toFixed(2)} ms`, 0, 48);
          prev_x = 0;
          prev_y = 0;
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
        <div class="flex">
          <input type="file" onChange={handle_file_input_change}></input>
          <div class="flex">
            <label>FFT size：</label>
            <select onChange={(e) => set_fft_size(parseInt(e.target.value))}>
              <For each={fft_sizes}>
                {(it) => (
                  <option value={it} selected={it === fft_size()}>
                    {it}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <div class="flex">
          <label>对数~线性：</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={log_or_linear()}
            onInput={(e) => {
              set_log_or_linear(parseFloat(e.target.value));
            }}
          ></input>
        </div>
        <div class="flex">
          <label>擦除透明度：</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha()}
            onInput={(e) => {
              set_alpha(parseFloat(e.target.value));
            }}
          ></input>
        </div>
        <div class="flex">
          <label>曲线缓动：</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={an_smoothing()}
            onInput={(e) => {
              set_an_smoothing(parseFloat(e.target.value));
            }}
          ></input>
        </div>
        <div class="flex gap-2">
          <div>
            <label>特征定位：</label>
            <input
              type="checkbox"
              onChange={(e) => {
                set_detect_local_max(e.target.checked);
              }}
            ></input>
          </div>
          <div>
            <label>窗口大小：</label>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={detect_local_max_size()}
              onInput={(e) => {
                set_detect_local_max_size(parseFloat(e.target.value));
              }}
            ></input>
          </div>
        </div>
        <audio class="w-full" ref={audio_player} src={obj_url()} controls></audio>
      </div>
    </div>
  );
};
