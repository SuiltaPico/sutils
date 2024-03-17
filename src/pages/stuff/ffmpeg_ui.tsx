import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createResource,
  createSignal,
} from "solid-js";
import { Button } from "../../components/common/Button";

const load = async (sure: boolean) => {
  if (!sure) return;

  const core_baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
  const ffmpeg = new FFmpeg();

  await ffmpeg.load({
    coreURL: await toBlobURL(
      `${core_baseURL}/ffmpeg-core.js`,
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      `${core_baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
    workerURL: await toBlobURL(
      `${core_baseURL}/ffmpeg-core.worker.js`,
      "text/javascript"
    ),
  });

  return ffmpeg;
};

export const FFmpegUI = () => {
  const [download_ffmpeg, set_download_ffmpeg] = createSignal(true);
  const [cmd, set_cmd] = createSignal<string>("");
  const [ffmpeg_logs, set_ffmpeg_logs] = createSignal<string[]>([]);

  const [ffmpeg] = createResource(download_ffmpeg, load);
  createEffect(() => {
    ffmpeg()?.on("log", ({ message }) => {
      set_ffmpeg_logs([...ffmpeg_logs(), message]);
    });
    ffmpeg()?.on("progress", (ev) => {
      console.log(ev);

      // set_ffmpeg_logs([...ffmpeg_logs(), ev.progress]);
    });
  });

  function handle_send_cmd() {
    ffmpeg()?.exec(cmd().split(" "));
  }

  return (
    <div class="flex flex-col w-full h-full items-center p-4 overflow-y-auto bg-neutral-200">
      <Switch>
        <Match when={!download_ffmpeg()}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">确定加载 FFmpeg？</div>
            <div>
              <Button
                color="white"
                bgcolor="#2563eb"
                onClick={() => {
                  set_download_ffmpeg(true);
                }}
              >
                确定（大约33MB）
              </Button>
            </div>
          </div>
        </Match>

        <Match when={ffmpeg.loading}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">加载中……请稍等</div>
          </div>
        </Match>

        <Match when={ffmpeg.state === "errored"}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">加载 FFmpeg 失败</div>
            <div>原因：{String(ffmpeg.error)}</div>
          </div>
        </Match>

        <Match when={true}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div>
              <div>输入</div>
              <div>
                <input type="file" />
              </div>
              <div>交互窗口</div>
              <div class="font-mono p-2 border max-h-[60vh] overflow-y-auto">
                <For each={ffmpeg_logs()}>{(it) => <div class="whitespace-pre-wrap">{it}</div>}</For>
              </div>
              <div class="flex items-center gap-2">
                <textarea
                  value={cmd()}
                  onInput={(e) => {
                    set_cmd(e.target.value);
                  }}
                ></textarea>
                <Button
                  onClick={() => {
                    handle_send_cmd();
                  }}
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
