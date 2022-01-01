import { Settings } from "../preview";

function getSettings(): Settings {
  const element = document.getElementById("settings");
  if (element) {
    const data = element.getAttribute("data-settings");
    if (data) {
      return JSON.parse(data);
    }
  }

  throw new Error("Could not load settings");
}

// Initially based on demo.html
// https://github.com/jscad/OpenJSCAD.org/blob/b4d808a34fccd3fc72a327921dfd9fa997de9d99/packages/utils/regl-renderer/demo.html
import {
  prepareRender,
  drawCommands,
  cameras,
  controls,
  entitiesFromSolids,
} from "@jscad/regl-renderer";
import { measurements } from "@jscad/modeling";

interface State {
  camera: any;
  controls: any;
}

const vscode = acquireVsCodeApi<State>();
const previousState = vscode.getState();

const main = async () => {
  const solidsJson = await (await fetch(getSettings().src)).json();
  const entities = entitiesFromSolids({}, solidsJson);

  const [minBoundingBox, maxBoundingBox] =
    measurements.measureAggregateBoundingBox(solidsJson);

  const perspectiveCamera = cameras.perspective;
  const orbitControls = controls.orbit;

  document.body.style.height = "100%";
  document.body.oncontextmenu = () => false;
  const containerElement = document.getElementById("jscad")!;
  containerElement.style.height = "100%";
  const resetButton = document.createElement("button");
  resetButton.innerText = "Reset";
  resetButton.style.position = "absolute";
  resetButton.onclick = () => {
    state.camera.position = initialState.camera.position;
    state.camera.target = initialState.camera.target;
    state.controls = { ...state.controls, ...initialState.controls };
    updateView = true;
  };
  document.body.prepend(resetButton);

  const initialState = {
    camera: perspectiveCamera.defaults,
    controls: {
      ...orbitControls.defaults,
      ...orbitControls.zoomToFit({
        controls: orbitControls.defaults,
        camera: perspectiveCamera.defaults,
        entities: entities as any,
      }).controls,
    },
  };

  let state = previousState ?? initialState;

  const onResize = () => {
    perspectiveCamera.setProjection(state.camera, state.camera, {
      width: containerElement.clientWidth,
      height: containerElement.clientHeight,
    });
    perspectiveCamera.update(state.camera, state.camera);
  };

  new ResizeObserver(onResize).observe(containerElement);

  const renderer = prepareRender({
    glOptions: { container: containerElement },
  });

  const size = minBoundingBox.map((n, i) =>
    Math.max(Math.abs(n) + Math.abs(maxBoundingBox[i]))
  );

  const gridOptions = {
    visuals: {
      drawCmd: "drawGrid",
      show: true,
    },
    size: [Math.max(size[0], size[1]) * 2, Math.max(size[0], size[1]) * 2],
    ticks: [10, 1],
    color: [0, 0, 1, 1],
    subColor: [0, 0, 1, 0.5],
  };

  const axisOptions = {
    visuals: {
      drawCmd: "drawAxis",
      show: true,
    },
    size: Math.max(size[0], size[1], size[2]),
    // alwaysVisible: false,
    // xColor: [0, 0, 1, 1],
    // yColor: [1, 0, 1, 1],
    // zColor: [0, 0, 0, 1]
  };

  // assemble the options for rendering
  const renderOptions = {
    camera: state.camera,
    drawCommands: {
      drawAxis: drawCommands.drawAxis,
      drawGrid: drawCommands.drawGrid,
      drawLines: drawCommands.drawLines,
      drawMesh: drawCommands.drawMesh,
    },
    // define the visual content
    entities: [gridOptions, axisOptions, ...entities],
  };

  // the heart of rendering, as themes, controls, etc change
  let updateView = true;

  const doRotatePanZoom = () => {
    if (rotateDelta[0] || rotateDelta[1]) {
      const updated = orbitControls.rotate(
        { controls: state.controls, camera: state.camera, speed: rotateSpeed },
        rotateDelta
      );
      state.controls = { ...state.controls, ...updated.controls };
      updateView = true;
      rotateDelta = [0, 0];
    }

    if (panDelta[0] || panDelta[1]) {
      const updated = orbitControls.pan(
        { controls: state.controls, camera: state.camera, speed: panSpeed },
        panDelta
      );
      state.controls = { ...state.controls, ...updated.controls };
      panDelta = [0, 0];
      state.camera.position = updated.camera.position;
      state.camera.target = updated.camera.target;
      updateView = true;
    }

    if (zoomDelta) {
      const updated = orbitControls.zoom(
        { controls: state.controls, camera: state.camera, speed: zoomSpeed },
        zoomDelta
      );
      state.controls = { ...state.controls, ...updated.controls };
      zoomDelta = 0;
      updateView = true;
    }
  };

  const updateAndRender = () => {
    doRotatePanZoom();

    if (updateView) {
      const updates = orbitControls.update({
        controls: state.controls,
        camera: state.camera,
      });
      state.controls = { ...state.controls, ...updates.controls };
      updateView = state.controls.changed; // for elasticity in rotate / zoom

      state.camera.position = updates.camera.position;
      perspectiveCamera.update(state.camera);

      renderer(renderOptions);

      vscode.setState(state);
    }
    window.requestAnimationFrame(updateAndRender);
  };
  window.requestAnimationFrame(updateAndRender);

  // convert HTML events (mouse movement) to viewer changes
  let lastX = 0;
  let lastY = 0;

  const rotateSpeed = 0.002;
  const panSpeed = 1;
  const zoomSpeed = 0.08;
  let rotateDelta = [0, 0];
  let panDelta = [0, 0];
  let zoomDelta = 0;
  let pointerDown = false;

  const moveHandler = (ev: PointerEvent) => {
    if (!pointerDown) return;
    const dx = lastX - ev.pageX;
    const dy = ev.pageY - lastY;

    if (ev.shiftKey) {
      panDelta[0] += dx;
      panDelta[1] += dy;
    } else {
      rotateDelta[0] -= dx;
      rotateDelta[1] -= dy;
    }

    lastX = ev.pageX;
    lastY = ev.pageY;

    ev.preventDefault();
  };

  const downHandler = (ev: PointerEvent) => {
    pointerDown = true;
    lastX = ev.pageX;
    lastY = ev.pageY;
    containerElement.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  };

  const upHandler = (ev: PointerEvent) => {
    pointerDown = false;
    containerElement.releasePointerCapture(ev.pointerId);
    ev.preventDefault();
  };

  const wheelHandler = (ev: WheelEvent) => {
    zoomDelta += ev.deltaY;
    ev.preventDefault();
  };

  containerElement.onpointermove = moveHandler;
  containerElement.onpointerdown = downHandler;
  containerElement.onpointerup = upHandler;
  containerElement.onwheel = wheelHandler;

  onResize();
};

window.onload = () => {
  main();
};
