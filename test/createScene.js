var createScene = function () {

    var lsyData = null;
    var gaussianSplattingsMesh = null;
    var gaussianSplattingsFile = null;

    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(1.0, 1.0, 1.0);   

    let radius = 3;
    var camera = new BABYLON.ArcRotateCamera("camera1", -Math.PI / 2, Math.PI / 2, radius,new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    camera.fov = 0.6;

    let [instructions, convertBt, downloadBt, progressBar, progressBarInner]  = createUI();

    let filesInput = new BABYLON.FilesInput(engine, null, scene, null, null, null, function () { BABYLON.Tools.ClearLogCache() }, null, null);
    filesInput.onProcessFileCallback = (file, name, extension) => {dragAndDropCB(file, name, extension); };
    filesInput.monitorElementForDragNDrop(canvas);

    function dragAndDropCB(file, name, extension) {
        if(extension !== "splat" && extension !== "ply" && extension !== "lsy") {
            alert("仅仅支持.splat, .ply, 和 .lsy 文件 ");
            return;
        }
    
        gaussianSplattingsFile = name.replace(/\.[^/.]+$/, "");

        if(gaussianSplattingsMesh) {
            gaussianSplattingsMesh.dispose();        
        }
        
        const blob = new Blob([file]);
        let url = URL.createObjectURL(blob); 
        if(extension === "lsy") {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const arrayBuffer = this.result;
                const lsyData = new Uint8Array(arrayBuffer);
                
                let newGS = fromlsy(lsyData, scene)
                if(gaussianSplattingsMesh)
                    gaussianSplattingsMesh.dispose();
                gaussianSplattingsMesh = newGS;         
                instructions.isVisible = false;         
            };
            fileReader.readAsArrayBuffer(blob);
        }
        else {
            gaussianSplattingsMesh = new BABYLON.GaussianSplattingMesh("gs", url, scene, true);
    
            gaussianSplattingsMesh.onMeshReadyObservable.add(() => {
                instructions.isVisible = false;
                convertBt.isVisible = true;
                downloadBt.isVisible = false;
            });     
        }
    }

    convertBt.onPointerDownObservable.add(function() {
        convertBt.isVisible = false;

        progressBarInner.isVisible = true;
        progressBar.isVisible = true;
        updateProgressBar(0.0);
        
        babylonGsTolsy(gaussianSplattingsMesh, { updateCB: updateProgressBar}).then(
            (lsy) => {

                progressBarInner.isVisible = false;
                progressBar.isVisible = false;
                        
                lsyData = lsy;
                if(lsyData){
                    downloadBt.isVisible = true;

                    let newGS = fromlsy(lsyData, scene)
                    gaussianSplattingsMesh.dispose();
                    gaussianSplattingsMesh = newGS;
                }
                else {
                    alert("Failed to convert to lsy");
                    
                    gaussianSplattingsMesh.dispose();
                    gaussianSplattingsMesh = null;

                    instructions.isVisible = true;
                }
            }
        );
    });

    downloadBt.onPointerDownObservable.add(function() {
        downloadlsy(lsyData, gaussianSplattingsFile + ".lsy");
    }  );

    function updateProgressBar(progress) {
        progressBarInner.width = progress;
    }

    return scene;
};

function createUI() {
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var text1 = new BABYLON.GUI.TextBlock();
    text1.text = "拖放文件高斯文件\n支持 .ply .splat .lsy文件";
    text1.color = "black";
    text1.fontSize = 40;
    advancedTexture.addControl(text1);   
    
    var convertBt = BABYLON.GUI.Button.CreateSimpleButton("convert", "Convert");
    convertBt.width = 0.2;
    convertBt.height = 0.2;
    convertBt.color = "white";
    convertBt.background = "black";
    // make the button's corner round
    convertBt.cornerRadius = 20;
    convertBt.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    convertBt.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    convertBt.isVisible = false;
    advancedTexture.addControl(convertBt);

    var downloadBt = BABYLON.GUI.Button.CreateSimpleButton("download", "Download");
    downloadBt.width = 0.2;
    downloadBt.height = 0.2;
    downloadBt.color = "white";
    downloadBt.background = "green";
    downloadBt.cornerRadius = 20;
    downloadBt.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    downloadBt.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    downloadBt.isVisible = false;
    advancedTexture.addControl(downloadBt);

    var progressBar = new BABYLON.GUI.Rectangle();
    progressBar.height = 0.1;
    progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    progressBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    progressBar.background = "black";
    progressBar.isVisible = false;
    advancedTexture.addControl( progressBar );

    var progressBarInner = new BABYLON.GUI.Rectangle();
    progressBarInner.width = 0;
    progressBarInner.height = 0.1; 
    progressBarInner.thickness = 0;
    progressBarInner.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    progressBarInner.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    progressBarInner.background = "green";
    progressBarInner.isVisible = false;
    advancedTexture.addControl( progressBarInner );
    
    return [text1, convertBt, downloadBt, progressBar, progressBarInner];
}

function downloadlsy(lsy, filename) {
    const blob = new Blob([lsy.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
  
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);    
}

