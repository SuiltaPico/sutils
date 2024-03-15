/* @refresh reload */
import { render } from "solid-js/web";

import { Route, Router } from "@solidjs/router";
import { lazy } from "solid-js";
import "./index.css";

const root = document.getElementById("root");

async function wrapper<T>(compo: Promise<T>, prop_name: keyof T) {
  return {
    default: (await compo)[prop_name],
  };
}

render(
  () => (
    <Router>
      <Route path="/stuff">
        <Route
          path="/music_player"
          component={lazy(async () =>
            wrapper(import("./pages/stuff/music_player"), "MusicPlayer")
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
    </Router>
  ),
  root!
);
