function twoBytesToInt(byte1, byte2) {
    if (byte1 < 0 || byte1 > 255 || byte2 < 0 || byte2 > 255) {
      throw new Error('Input bytes must be between 0 and 255');
    }
  
    const combined = byte1 << 8 | byte2;  // Shift the first byte left by 8 bits and combine with the second byte
    return combined;
}

function extractArrays(combinedArray) {

    // print length
    console.log("combinedArray.length: ", combinedArray.length);
    
    // read the version
    const floatSize = Float32Array.BYTES_PER_ELEMENT;
    let tmpBuffer  = new Float32Array(combinedArray.slice(0, floatSize).buffer);
    const version = Math.round(tmpBuffer[0]);

    const numFloats = version === 1 ?  14 :
                      version === 2 ?  16 : 
                      version === 3 ?  15 :
                        0;

    if(numFloats === 0) {
        console.error("Invalid version: ", version);
        return null;
    }

    const floatArraySize = numFloats * floatSize;

    const floatBuffer = combinedArray.slice(0, floatArraySize).buffer;
    const floatView = new Float32Array(floatBuffer);

    const uintBuffer = combinedArray.slice(floatArraySize).buffer;
    const uintView = new Uint8Array(uintBuffer);

    return [floatView, uintView ];

}

function fromlsy(lsyData, scene) {

    let [floatData, uint8Data] = extractArrays(lsyData);
    
    if(floatData.length != 15) {
        console.error("Invalid float data size: expected 15, got ", floatData.length);
        return null;
    }

    let posBounds = floatData.slice(1, 7);
    let scaleBounds = floatData.slice(7, 13);
    let nSplats = floatData[13];
    let nUniqueColors = floatData[14];

    const lsyRowLength = 2*3 + 3 + 4 + 1;
    const colDataRowLength = 4;
    const posOffset = 0;
    const scaleOffset = 2 * 3 * nSplats + posOffset;
    const quatOffset = 3 * nSplats + scaleOffset;
    const colIndOffset = 4 * nSplats + quatOffset;
    const colDataOffset = 2 * nSplats + colIndOffset;

    if(colDataOffset + colDataRowLength * nUniqueColors != uint8Data.length) {
        console.error("Invalid data size for ", nSplats, " splats: expected ", nSplats * 17 + 2, " got ", uint8Data.length);
        return null;
    }

    const uBuffer = new Uint8Array(nSplats * cGSData.ROW_LENGTH_IN_BITES);
    const fBuffer = new Float32Array(uBuffer.buffer);
        
    let gsData = new cGSData(uBuffer);
    for(let i=0; i<nSplats; i++) {

        let posInd = gsData.getBufferInd(cGSData.POSITION, i);
        let scaleInd = gsData.getBufferInd(cGSData.SCALE, i);
        let quatInd = gsData.getBufferInd(cGSData.QUATERNION, i);
        let colorInd = gsData.getBufferInd(cGSData.COLOR, i);

        for(let j=0; j<3; j++) {
            
            let value = twoBytesToInt(uint8Data[posOffset + i * 6 + 2*j], uint8Data[posOffset + i * 6 + 2*j + 1]);
            fBuffer[posInd + j] = posBounds[2*j] + (value / 65535) * (posBounds[2*j+1] - posBounds[2*j]);

            fBuffer[scaleInd + j] = scaleBounds[2*j] + (uint8Data[scaleOffset + i * 3 + j] / 255) * (scaleBounds[2*j+1] - scaleBounds[2*j]);
        }

            for(let j=0; j<4; j++) {
                uBuffer[quatInd + j] = uint8Data[quatOffset + i * 4 + j];
        }
    
        // record the colors
        let uniqueColorInd = twoBytesToInt(uint8Data[colIndOffset + i*2], uint8Data[colIndOffset + i*2 + 1]);
        for(let j=0; j<4; j++) {
            uBuffer[colorInd + j] = uint8Data[colDataOffset + uniqueColorInd * 4 + j];
        }
    }

    let gsMesh = new BABYLON.GaussianSplattingMesh("gs", undefined, scene, true);
    gsMesh.updateData(uBuffer);
    return gsMesh;
}
