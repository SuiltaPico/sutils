/* @refresh reload */
import { render } from "solid-js/web";

import { A, Route, Router } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  lazy,
} from "solid-js";
import "./index.css";

const root = document.getElementById("root");

async function wrapper<T>(compo: Promise<T>, prop_name: keyof T) {
  return {
    default: (await compo)[prop_name],
  };
}

export function RouteRender(props: { route: any; path: string }) {
  const curr_path = props.path + props.route.path;
  return (
    <>
      <Switch>
        <Match when={props.route.children === undefined}>
          <div>
            <A href={curr_path}>{curr_path}</A>
          </div>
        </Match>
        <Match when={Array.isArray(props.route.children)}>
          <For each={props.route.children}>
            {(it) => <RouteRender route={it} path={curr_path}></RouteRender>}
          </For>
        </Match>
        <Match when={true}>
          <RouteRender
            route={props.route.children}
            path={curr_path}
          ></RouteRender>
        </Match>
      </Switch>
    </>
  );
}

render(() => {
  let [routes, set_routes] = createSignal([]);

  const Routes = () => {
    return (
      <>
        <Route
          path="/"
          component={() => (
            <div class="flex items-center justify-center w-full h-full bg-neutral-200">
              <div>
                <For each={routes()}>
                  {(it) => <RouteRender route={it} path=""></RouteRender>}
                </For>
              </div>
            </div>
          )}
        ></Route>
        <Route path="/stuff">
          <Route path="/nothing" component={() => ""}></Route>
          <Route
            path="/music_player"
            component={lazy(async () =>
              wrapper(import("./pages/stuff/music_player"), "MusicPlayer")
            )}
          ></Route>
          <Route
            path="/ffmpeg_ui"
            component={lazy(async () =>
              wrapper(import("./pages/stuff/ffmpeg_ui"), "FFmpegUI")
            )}
          ></Route>
        </Route>
        <Route path="/audio">
          <Route
            path="/fake_bit_depth"
            component={lazy(async () =>
              wrapper(import("./pages/audio/fake_bit_depth"), "FakeBitDepth")
            )}
          ></Route>
        </Route>
        <Route
          path="/*404"
          component={() => (
            <div
              class="flex flex-row h-full items-center justify-center text-4xl transition-all hover:bg-neutral-900 hover:text-neutral-50"
              style={{
                "transition-duration": "30s",
              }}
            >
              Sorry, [404 Not Found].
            </div>
          )}
        ></Route>
      </>
    );
  };

  createEffect(() => {
    console.log(routes());
  });

  return <Router>{(set_routes((<Routes></Routes>) as any), routes())}</Router>;
}, root!);
