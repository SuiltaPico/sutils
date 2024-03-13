/* @refresh reload */
import { render } from "solid-js/web";

import { Route, Router } from "@solidjs/router";
import "./index.css";
import { MusicPlayer } from "./pages/stuff/music_player";

const root = document.getElementById("root");

render(
  () => (
    <Router>
      <Route path="/stuff">
        <Route path="/music_player" component={MusicPlayer}></Route>
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
