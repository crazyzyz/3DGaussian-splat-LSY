var canvas = document.getElementById("renderCanvas");
var engine = null;
var scene = null;

async function initializeBabylonEngine() {

    const createDefaultEngine = function() {
        return new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            disableWebGL2Support: false
        });
    };

    const asyncEngineCreation = async function() {
        try {
            return createDefaultEngine();
        } catch (e) {
            console.log("Engine creation failed. Trying default engine...");
            return createDefaultEngine();
        }
    };

    engine = await asyncEngineCreation();
    if (!engine) throw 'Engine creation failed.';

    window.addEventListener("resize", function () {
        engine.resize();
    });

    engine.runRenderLoop(function () {
        if (scene && scene.activeCamera) {
            scene.render();
        }
    });

    return engine;
}

async function main() {
    const engine = await initializeBabylonEngine();
    scene = createScene(engine);
}

main();
