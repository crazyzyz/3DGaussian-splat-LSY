class cGSData {
    static ROW_LENGTH_IN_BITES = 32; // Bytes per splat
    static FLOAT_SIZE = 4; // Bytes per float
    static ROW_LENGTH_IN_FLOATS = cGSData.ROW_LENGTH_IN_BITES / cGSData.FLOAT_SIZE;

    static POSITION = 0;
    static SCALE = 1;
    static QUATERNION = 2;
    static COLOR = 3;
    static MASTER_BUFFER = 4;

    constructor(splatData){       
        
        this.uBuffer = new Uint8Array(splatData);
        this.fBuffer = new Float32Array(this.uBuffer.buffer);

        if(!this.uBuffer){
            console.error("invalid splatData")
        }
    }

    getBuffer(typeData) {
        switch(typeData){
            case cGSData.POSITION:
            case cGSData.SCALE:
                return this.fBuffer;
            case cGSData.QUATERNION:
            case cGSData.COLOR:
            case cGSData.MASTER_BUFFER:
                return this.uBuffer;
        }
        console.log(typeData, " returning NULL");
        return null;
    }

    getBufferInd(typeData, splatInd){
        switch(typeData){
            case cGSData.POSITION:
                return cGSData.ROW_LENGTH_IN_FLOATS * splatInd;
            case cGSData.SCALE:
                return cGSData.ROW_LENGTH_IN_FLOATS * splatInd + 3;
            case cGSData.QUATERNION:
                return cGSData.ROW_LENGTH_IN_BITES * splatInd + 28;
            case cGSData.COLOR:
                return cGSData.ROW_LENGTH_IN_BITES * splatInd + 24;
        }
        return -1;
    }


    print(ind) {
        const pBuffer  = this.getBuffer(cGSData.POSITION)
        const sBuffer  = this.getBuffer(cGSData.SCALE)
        const qBuffer  = this.getBuffer(cGSData.QUATERNION)
        const cBuffer  = this.getBuffer(cGSData.COLOR)
    
         let bufferInd = this.getBufferInd(cGSData.POSITION, ind);
         console.log("pos ", pBuffer[bufferInd], pBuffer[bufferInd+1],pBuffer[bufferInd+2])

         bufferInd = this.getBufferInd(cGSData.SCALE, ind);
         console.log("scl ", sBuffer[bufferInd], sBuffer[bufferInd+1], sBuffer[bufferInd+2])

         bufferInd = this.getBufferInd(cGSData.QUATERNION, ind);
         let quat = [];
         for(let i=0; i<4; i++) {
            quat[i] = (qBuffer[bufferInd + i] - 128) / 128;
         }
         console.log("quat ", quat[0], quat[1], quat[2], quat[3])
    }

    getNumberOfSplats() {
        return this.fBuffer.length / cGSData.ROW_LENGTH_IN_FLOATS;
    }

    getPositionBounds() {
        
        let min = [100000, 100000, 100000];
        let max = [-100000, -100000, -100000];

        for(let i=0; i<this.getNumberOfSplats(); i++){
            let bufferInd = this.getBufferInd(cGSData.POSITION, i);
            for(let j=0; j<3; j++){
                if(i===0 || this.fBuffer[bufferInd + j] < min[j]){
                    min[j] = this.fBuffer[bufferInd + j];
                }
                if(i===0 || this.fBuffer[bufferInd + j] > max[j]){
                    max[j] = this.fBuffer[bufferInd + j];
                }
            }
        }

        let eps = 0.0001;
        return ensureDifference(min, max, eps);
    }

    getScaleBounds() {
        let min = [100000, 100000, 100000];
        let max = [-100000, -100000, -100000];

        for(let i=0; i<this.getNumberOfSplats(); i++){
            let bufferInd = this.getBufferInd(cGSData.SCALE, i);
            for(let j=0; j<3; j++){
                if(i===0 || this.fBuffer[bufferInd + j] < min[j]){
                    min[j] = this.fBuffer[bufferInd + j];
                }
                if(i===0 || this.fBuffer[bufferInd + j] > max[j]){
                    max[j] = this.fBuffer[bufferInd + j];
                }
            }
        }

        let eps = 0.0001;
        return ensureDifference(min, max, eps);
    }

    async getUniqueColors(colorTolerance, maxIndexCount, updateCB) {
        let n = this.getNumberOfSplats();
        let cBuffer = this.getBuffer(cGSData.COLOR);
        let splatIndToCInd = new Array(n).fill(-1);        
        let uniqueColors = [];
        for(let i=0; i<n; i++){

            if (i % 1000 === 0) {
                await new Promise(resolve => {
                  requestAnimationFrame(() => {
                    
                    if(updateCB){
                        updateCB((i + 1.0) / n);
                    }
                    let progress = Math.floor((i + 1) / n * 100);
                    console.log("progress", progress);

                    resolve();
                  });
                });
            } // end if

            let bufferInd = this.getBufferInd(cGSData.COLOR, i);
            // check if the color is already in the set
            let isUnique = true;
            let uniqueInd = 0;
            for(let uniqueColor of uniqueColors){
                let sumSq = 0;
                // compare uniqueColor with the i-th color 
                for(let j=0; j<4; j++){
                    sumSq += Math.pow(uniqueColor[j] - cBuffer[bufferInd+j], 2);
                }
                if(sumSq < colorTolerance){
                    isUnique = false;
                    splatIndToCInd[i] = uniqueInd;
                    break;
                }
                uniqueInd++;

                if(uniqueInd > maxIndexCount){
                    console.error("Too many unique colors. Max number allowed is ", maxIndexCount);
                    return null;
                }                
            }

            if(isUnique){

                splatIndToCInd[i] = uniqueColors.length;

                let color = [cBuffer[bufferInd], cBuffer[bufferInd+1], cBuffer[bufferInd+2], cBuffer[bufferInd+3]];                
                uniqueColors.push(color);
            }
        }

        return [splatIndToCInd, uniqueColors];
    }
}

function ensureDifference(min, max, eps) {
    if(Math.abs(min[0] - max[0]) < eps){
        min[0] -= eps;
        max[0] += eps;
    }
    if(Math.abs(min[1] - max[1]) < eps){
        min[1] -= eps;
        max[1] += eps;
    }
    if(Math.abs(min[2] - max[2]) < eps){
        min[2] -= eps;
        max[2] += eps;
    }
    return [min[0], max[0], min[1], max[1], min[2], max[2]];
}
