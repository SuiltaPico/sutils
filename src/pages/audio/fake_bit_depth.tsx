import { Component, createEffect, createSignal, on } from "solid-js";
import { WaveFile } from "wavefile";
// import { scaleLinear, ScaleLinear } from "d3-scale";

// type ScalerMap = Record<number, ScaleLinear<number, number, never>>;

export const FakeBitDepth: Component = () => {
  const [src_bit_depth, set_src_bit_depth] = createSignal(-1);
  const [wav, set_wav] = createSignal<WaveFile>();
  const [fake_probability, set_fake_probability] = createSignal(0);

  createEffect(
    on(wav, (w) => {
      if (!w) return;

      // @ts-ignore
      set_src_bit_depth(w.dataType.bits);
      // @ts-ignore
      // set_scaler_map(generate_scale(w.dataType.bits));

      const map: Map<number, boolean> = new Map();

      const samples = w.getSamples();

      console.time("to map");
      // @ts-ignore
      samples[0].forEach((it, index) => {
        if (index % 10 === 0) {
          map.set(it, true);
        }
      });
      console.timeEnd("to map");

      const sorted_key = Array.from(map.keys()).sort((a, b) => a - b);
      let latest = sorted_key[0];
      let sum = 0;
      for (let index = 1; index < sorted_key.length; index++) {
        const key = sorted_key[index];
        sum += key - latest;
        latest = key;
      }
      sum /= sorted_key.length;
      console.log(sum);

      set_fake_probability(sum / 255);
    })
  );

  async function handle_file_input_change(e: { target: HTMLInputElement }) {
    if (!e.target.files?.length) return;

    set_wav(
      new WaveFile(new Uint8Array(await e.target.files![0].arrayBuffer()))
    );
  }

  return (
    <div class="flex flex-col w-full h-full relative items-center bg-neutral-200">
      <div class="flex flex-col bg-[#fffa] backdrop-blur-[10px] p-4 rounded shadow gap-2 mt-5">
        <input type="file" onChange={handle_file_input_change} />
        <div>位深：{src_bit_depth()}</div>
        <div>假高位深概率：{fake_probability() * 100 + "%"}</div>
      </div>
    </div>
  );
};
