import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import Dexie from "dexie";
import {
  Accessor,
  Component,
  For,
  Match,
  Resource,
  Switch,
  createEffect,
  createRenderEffect,
  createResource,
  createSignal,
} from "solid-js";
import { SettingTable, setting_decl } from "../../common/settings";
import { Button } from "../../components/common/Button";
import { parse_command_string } from "../../common/cmd";

class AppDatabase extends Dexie {
  settings!: SettingTable;

  constructor() {
    super("stuff/ffmpeg_ui");
    this.version(1).stores({
      settings: setting_decl,
    });
  }
}

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

type FFmpegOutputTree = {
  header?: string;
  value?: string;
} & FFmpegOutputTree[];

export const FFmpegOutputTreeRenderer: Component<{
  it: FFmpegOutputTree;
  path: string[];
}> = (props) => {
  function header_translator(header?: string) {
    const map = {
      metadata: "元信息",
      track: "音轨",
      artist: "艺术家",
      title: "标题",
      album: "专辑",
      encoder: "编码器",
      comment: "注释",
      duration: "时长",
      creation_time: "创建日期",
      major_brand: "主要 brand",
      minor_version: "最低版本",
      compatible_brands: "兼容 brand",
      handler_name: "处理者名称",
      vendor_id: "供应商 ID",
      disc: "光盘编号",
    };
    const in_map = map[header?.toLowerCase() as keyof typeof map];
    if (in_map) {
      return in_map;
    }
    return header;
  }

  return (
    <div class="flex flex-col">
      <div class="flex">
        <div class="w-max">{header_translator(props.it.header)}</div>
        <div>:</div>
        <div>{props.it.value}</div>
      </div>
      <div class="flex flex-col p-2">
        <For each={props.it}>
          {(it, index) => (
            <FFmpegOutputTreeRenderer
              it={it}
              path={props.path.concat(index().toString())}
            ></FFmpegOutputTreeRenderer>
          )}
        </For>
      </div>
    </div>
  );
};

export const FFmpegUIMain: Component<{
  ffmpeg_logs: Accessor<string[]>;
  ffmpeg: Resource<FFmpeg | undefined>;
}> = (props) => {
  let file_id_counter = 0;

  const [file_list, set_file_list] = createSignal<
    {
      file_name: string;
      file: File;
      tree: FFmpegOutputTree;
    }[]
  >([]);
  const [cmd, set_cmd] = createSignal<string>("");

  async function handle_file_input(e: { target: HTMLInputElement }) {
    const files = e.target.files;
    const f = props.ffmpeg();
    if (!files || !f) return;

    for (const file of files) {
      await f.writeFile(file.name, new Uint8Array(await file.arrayBuffer()));
      const logs: string[] = [];
      function handle_log(e: any) {
        logs.push(e.message);
      }
      f.on("log", handle_log);
      await f.exec(["-v", "info", "-i", file.name]);
      f.off("log", handle_log);

      let tree: FFmpegOutputTree = [];
      function get_level_tree(level: number, tree: FFmpegOutputTree) {
        if (level === 0) return tree;
        return get_level_tree(level - 1, tree[tree.length - 1]);
      }

      for (const log of logs) {
        const log_re =
          /^(?<indent>\s*)(?<header>[^\:]+?)\s*\:\s*(?<value>[^]+)?$/;
        const matched = log.match(log_re);
        if (
          !matched ||
          !matched.groups ||
          matched.groups.header === "configuration"
        )
          continue;

        const level = matched.groups!.indent.length / 2;
        const level_tree = get_level_tree(level, tree);
        const new_arr: FFmpegOutputTree = [];
        new_arr.header = matched.groups!.header!;
        new_arr.value = matched.groups!.value ?? "";
        level_tree.push(new_arr);
      }

      set_file_list([
        ...file_list(),
        {
          file,
          file_name: file.name,
          tree,
        },
      ]);
      file_id_counter += 1;
    }
  }

  function handle_send_cmd() {
    console.log(parse_command_string(cmd()));

    props.ffmpeg()?.exec(parse_command_string(cmd()));
  }

  return (
    <div class="flex flex-col gap-2 bg-white p-6 w-full h-full overflow-auto rounded">
      <div>输入</div>
      <div>
        <input type="file" onChange={handle_file_input} />
      </div>
      <div>文件列表</div>
      <div>
        <For each={file_list()}>
          {(it) => (
            <div>
              <div>{it.file_name}</div>
              <FFmpegOutputTreeRenderer
                it={it.tree}
                path={[]}
              ></FFmpegOutputTreeRenderer>
            </div>
          )}
        </For>
      </div>
      <div class="flex flex-col w-full">
        <div>交互窗口</div>
        <code class="font-mono p-2 border max-h-[60vh] overflow-y-auto">
          <For each={props.ffmpeg_logs()}>
            {(it) => <div class="whitespace-pre-wrap">{it}</div>}
          </For>
        </code>
        <div class="flex items-center gap-2">
          <textarea
            class="grow"
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
  );
};

export const FFmpegUI = () => {
  const db = new AppDatabase();

  const [ffmpeg_logs, set_ffmpeg_logs] = createSignal<string[]>([]);
  const [download_ffmpeg, set_download_ffmpeg] = createSignal(false);

  const [ffmpeg] = createResource(download_ffmpeg, load);

  const init = (async () => {
    const auto_load_ffmpeg = (await db.settings.get("auto_load_ffmpeg"))?.value;
    set_download_ffmpeg(auto_load_ffmpeg === "true");
  })();

  createEffect(() => {
    ffmpeg()?.on("log", ({ message }) => {
      set_ffmpeg_logs([...ffmpeg_logs(), message]);
    });
    ffmpeg()?.on("progress", (ev) => {
      console.log(ev);

      // set_ffmpeg_logs([...ffmpeg_logs(), ev.progress]);
    });
  });

  async function handle_ensure_load_ffmpeg() {
    set_download_ffmpeg(true);
  }

  return (
    <div class="flex flex-col w-full h-full p-4 overflow-y-auto bg-neutral-200">
      <Switch>
        <Match when={!download_ffmpeg()}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">确定加载 FFmpeg？</div>
            <div>
              <Button
                color="white"
                bgcolor="#2563eb"
                onClick={handle_ensure_load_ffmpeg}
              >
                确定（大约33MB）
              </Button>
            </div>
          </div>
        </Match>

        <Match when={ffmpeg.loading}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">加载 FFmpeg 中……请稍等</div>
          </div>
        </Match>

        <Match when={ffmpeg.state === "errored"}>
          <div class="flex flex-col gap-2 bg-white p-6 rounded">
            <div class="text-xl">加载 FFmpeg 失败</div>
            <div>原因：{String(ffmpeg.error)}</div>
          </div>
        </Match>

        <Match when={true}>
          <FFmpegUIMain
            ffmpeg_logs={ffmpeg_logs}
            ffmpeg={ffmpeg}
          ></FFmpegUIMain>
        </Match>
      </Switch>
    </div>
  );
};
