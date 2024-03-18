import { Component, Show, createEffect, createSignal, on } from "solid-js";
import { WaveFile } from "wavefile";

export const FakeBitDepth: Component = () => {
  let audio_el: HTMLAudioElement;

  const [audio_file_url, set_audio_file_url] = createSignal<string>();
  createEffect(
    on(audio_file_url, (_, prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
    })
  );

  createEffect(
    on(audio_file_url, async () => {
    })
  );

  async function handle_file_input_change(e: { target: HTMLInputElement }) {
    if (e.target.files?.length !== 1) return;
    set_audio_file_url(URL.createObjectURL(e.target.files[0]));
  }

  return (
    <div class="flex flex-col w-full h-full relative items-center bg-neutral-200">
      <div class="flex flex-col bg-[#fffa] p-4 rounded shadow gap-2 mt-5 w-[80vw] max-w-[80vw]">
        <input type="file" onChange={handle_file_input_change} />
        <audio
          ref={
            //@ts-ignore
            audio_el
          }
          src={audio_file_url()}
          controls
        ></audio>
      </div>
    </div>
  );
};
