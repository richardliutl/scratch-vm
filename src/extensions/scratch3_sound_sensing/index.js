const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');
const Cast = require('../../util/cast');
const MathUtil = require('../../util/math-util');
const Timer = require('../../util/timer');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDAgNDAiPjxzdHlsZT4uc3Qwe3N0cm9rZTojMDAwO3N0cm9rZS1taXRlcmxpbWl0OjEwfTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTExLjMgMTRoMS41djEyaC0xLjV6TTE1LjMgOGgxLjV2MjRoLTEuNXpNMTkuMiAzaDEuNXYzNGgtMS41ek03LjMgMTdoMS41djZINy4zek0zLjMgMTguNWgxLjV2M0gzLjN6Ii8+PHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoLTE4MCAyNy45NzcgMjApIiBjbGFzcz0ic3QwIiBkPSJNMjcuMiAxNGgxLjV2MTJoLTEuNXoiLz48cGF0aCB0cmFuc2Zvcm09InJvdGF0ZSgtMTgwIDIzLjk4OCAyMCkiIGNsYXNzPSJzdDAiIGQ9Ik0yMy4yIDhoMS41djI0aC0xLjV6Ii8+PHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoLTE4MCAzMS45NjUgMjApIiBjbGFzcz0ic3QwIiBkPSJNMzEuMiAxN2gxLjV2NmgtMS41eiIvPjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKC0xODAgMzUuOTUzIDIwKSIgY2xhc3M9InN0MCIgZD0iTTM1LjIgMTguNWgxLjV2M2gtMS41eiIvPjwvc3ZnPg==';
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDAgNDAiPjxzdHlsZT4uc3Qwe2ZpbGw6I2ZmZjtzdHJva2U6I2ZmZjtzdHJva2UtbWl0ZXJsaW1pdDoxMH08L3N0eWxlPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMS4zIDE0aDEuNXYxMmgtMS41ek0xNS4zIDhoMS41djI0aC0xLjV6TTE5LjIgM2gxLjV2MzRoLTEuNXpNNy4zIDE3aDEuNXY2SDcuM3pNMy4zIDE4LjVoMS41djNIMy4zeiIvPjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKC0xODAgMjcuOTc3IDIwKSIgY2xhc3M9InN0MCIgZD0iTTI3LjIgMTRoMS41djEyaC0xLjV6Ii8+PHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoLTE4MCAyMy45ODggMjApIiBjbGFzcz0ic3QwIiBkPSJNMjMuMiA4aDEuNXYyNGgtMS41eiIvPjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKC0xODAgMzEuOTY1IDIwKSIgY2xhc3M9InN0MCIgZD0iTTMxLjIgMTdoMS41djZoLTEuNXoiLz48cGF0aCB0cmFuc2Zvcm09InJvdGF0ZSgtMTgwIDM1Ljk1MyAyMCkiIGNsYXNzPSJzdDAiIGQ9Ik0zNS4yIDE4LjVoMS41djNoLTEuNXoiLz48L3N2Zz4=';
/**
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */

class SlidingArray {
    /**
     * Handle a sliding function in an array.
     * @param {number} length - the number of previous values to remember.
     * @param {number} width - the size of the values e.g. 3-band sliding average uses width 3.
     * @param {string} weightType - either avg or var (average or variance).
     * @param {number} order - the number of reactive elements, one less than length
     * @param {array} values - the 2d array of past weighted values
     * @param {array} result - the array of desired results
     * @param {number} index - location of operation upon the values
     * @param {function} weight - creates values that when added together gives the desired result
     */
    constructor(length, width, weightType) {
        this.length = length;
        this.width = width;
        this.weightType = weightType;
        this.order = this.length - 1;
        this.values = new Array(this.length).fill(0).map(() => new Array(this.width).fill(0));
        this.result = new Array(this.width).fill(0);
        this.index = 0;
        this.weight = this.updateWeightType();
    }

    step(context) {
        for( var i = 0; i < this.width; i++) {
            if(this.weightType == 'avg') {
                newWeighted = this.weight(context.current[i]);
            }
            if(this.weightType == 'var') {
                newWeighted = this.weight(context.current[i], context.average[i]);
            }
            this.result[i] += newWeighted - this.values[this.index][i];
            this.values[this.index][i] = newWeighted; // Replace old value
        }
        this.index = (this.index + 1)%(this.length);
        return this.result;
    }

    updateWeightType() {
        if(this.weightType == 'avg') {
            return (x) => x / this.length;
        }
        if(this.weightType == 'var') {
            return (avg, x) => (avg - x)**2 / this.order;
        }
        return 0;
    }

    clear() {
        this.values = new Array(this.length).fill(0).map(() => new Array(this.width).fill(0));
        this.result = new Array(this.width).fill(0);
    }
} 

class Scratch3SoundSensingBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.timer = new Timer();
        this.spectrumTime = this.timer.time();
        this.audioInput = 'project';
        this.started = false;

        runtime.on('PROJECT_STOP_ALL', this.clear.bind(this));
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */

     // space blocks with 
                // '---',
    getInfo () {
        return {
            id: 'soundSensing',
            name: 'Sound Sensing',
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'whenPeakSliding',
                    text: formatMessage({
                        id: 'soundSensing.whenPeakSliding',
                        default: 'when [BAND] sound played',
                        description: 'check when audio peaks, calibratedly, in a range'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        BAND: {
                            type: ArgumentType.STRING,
                            menu: 'bands',
                            defaultValue: 'low'
                        }
                    }
                },
                {
                    opcode: 'get3Band',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'soundSensing.get3Band',
                        default: 'loudness of [BAND]',
                        description: 'get the energy in the requested three frequency band index'
                    }),
                    arguments: {
                        BAND: {
                            type: ArgumentType.STRING,
                            menu: 'bands',
                            defaultValue: 'low'
                        }
                    }
                },
                // {
                //     opcode: 'get3BandSliding',
                //     blockType: BlockType.REPORTER,
                //     text: formatMessage({
                //         id: 'soundSensing.get3BandAvg',
                //         default: 'get sliding 3-band [BAND] data',
                //         description: 'get the sliding average data in the requested three frequency band index'
                //     }),
                //     arguments: {
                //         BAND: {
                //             type: ArgumentType.STRING,
                //             menu: 'bands',
                //             defaultValue: 'low'
                //         }
                //     }
                // },
                // {
                //     opcode: 'whenPeak',
                //     text: formatMessage({
                //         id: 'soundSensing.whenPeak',
                //         default: 'when [BAND] peak',
                //         description: 'check when audio peaks in a range'
                //     }),
                //     blockType: BlockType.HAT,
                //     arguments: {
                //         BAND: {
                //             type: ArgumentType.STRING,
                //             menu: 'bands',
                //             defaultValue: 'low'
                //         }
                //     }
                // },
                {
                    opcode: 'setAudioInput',
                    text: formatMessage({
                        id: 'soundSensing.setAudioInput',
                        default: 'listen to [INPUT]',
                        description: 'set audio input to microphone or project'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputs',
                            defaultValue: 'project'
                        }
                    }
                },
                '---',
                {
                    opcode: 'replaySound',
                    text: formatMessage({
                        id: 'soundSensing.replaySound',
                        default: 'replay [BAND] sound',
                        description: 'play buffered sound from certain frequency range'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BAND: {
                            type: ArgumentType.STRING,
                            menu: 'bands',
                            defaultValue: 'low'
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'getSpectralFlux',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'soundSensing.getSpectralFlux',
                        default: 'amount of spectral flux',
                        description: 'get the amount of change in spectral energy'
                    })
                },
                {
                    opcode: 'getBand',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'soundSensing.getBand',
                        default: 'energy at [BAND] Hz',
                        description: 'get the energy in the requested frequency band index'
                    }),
                    arguments: {
                        BAND: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                }
            ],
            menus: {
                bands: [
                    {
                        text: 'bass',
                        value: 'low'
                    },
                    {
                        text: 'middle',
                        value: 'mid'
                    },
                    {
                        text: 'treble',
                        value: 'high'
                    }
                ],
                inputs: [
                    {
                        text: 'microphone',
                        value: 'microphone'
                    },
                    {
                        text: 'project',
                        value: 'project'
                    },
                    {
                        text: 'all',
                        value: 'all'
                    }
                ]
            }
        };
    }

    whenPeakSliding (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this._isPeakSliding(args.BAND);
    }

    isPeakSliding (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this._isPeakSliding(args.BAND);
    }

    _isPeakSliding (band) {
        if (typeof this.frequencyArray === 'undefined') return false;

        let bandIndex = {
            'low': 0,
            'mid': 1,
            'high': 2
        };
        let micCutoff = {
            'low': 100,
            'mid': 50,
            'high': 5
        };

        if(Math.sqrt(this.slidingStdResultArray[bandIndex[band]]) != 0 && this.avgEnergyArray[bandIndex[band]] - this.slidingAvgResultArray[bandIndex[band]] != 0) {
            var norm = (this.avgEnergyArray[bandIndex[band]] - this.slidingAvgResultArray[bandIndex[band]]) / Math.sqrt(this.slidingStdResultArray[bandIndex[band]]);
            // console.log(band + ':\t' + this.avgEnergyArray[bandIndex[band]]);
            if(norm > 1 && band == 'low') {
                this.replayBuf = this.soundBuf;
            }
        
            switch (this.audioInput) { // Ensure minimum energy for microphone inputs
                case 'microphone':
                    return this.avgEnergyArray[bandIndex[band]] > micCutoff[band] && norm > 1;
                case 'project':
                    return norm > 1;
                case 'all':
                    return this.avgEnergyArray[bandIndex[band]] > micCutoff[band] && norm > 1;
            }
        }
        return false;
    }

    whenPeak (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this._isPeak(args.BAND);
    }

    isPeak (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this._isPeak(args.BAND);
    }

    _isPeak (band) {
        if (typeof this.frequencyArray === 'undefined') return false;

        let bandIndex = {
            'low': 0,
            'mid': 1,
            'high': 2
        };

        return this.avgEnergyArray[bandIndex[band]] > 180;
    }

    get3BandSliding (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this.get3BandSlidingAvg(args.BAND);
    }

    get3BandSlidingAvg (band) {
        if (typeof this.frequencyArray === 'undefined') return -1;

        let bandIndex = {
            'low': 0,
            'mid': 1,
            'high': 2
        };

        return this.slidingAvgResultArray[bandIndex[band]];
    }

    get3Band (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this.get3BandValue(args.BAND);
    }

    get3BandValue (band) {
        if (typeof this.frequencyArray === 'undefined') return -1;

        let bandIndex = {
            'low': 0,
            'mid': 1,
            'high': 2
        };

        return this.avgEnergyArray[bandIndex[band]];
    }

    getBand (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this.getBandValue(args.BAND);
    }

    getBandValue (band) {
        if (typeof this.frequencyArray === 'undefined') return -1;

        let bandHz = Cast.toNumber(band);
        let bandNum = Math.round(bandHz * this.analyser.fftSize / this.sampleRate);
        bandNum = MathUtil.clamp(bandNum, 1, this.frequencyArray.length);
        let energy = 0;
        switch (this.audioInput) { // Ensure getting energy from right source(s)
            case 'microphone':
                energy = this.frequencyArrayMic[bandNum - 1];
                energy = (energy / 255) * 100;
                return energy;
            case 'project':
                energy = this.frequencyArray[bandNum - 1];
                energy = (energy / 255) * 100;
                return energy;
            case 'all':
                energy = Math.max(this.frequencyArray[bandNum - 1], this.frequencyArrayMic[bandNum - 1]);
                energy = (energy / 255) * 100;
                return energy;
        }
    }

    getSpectralFlux (args) {
        if (!this.conservativeAnalyze()) return -1;

        return this.spectralFlux;
    }

// From https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext

    replaySound (args) {
        const audioContext = this.runtime.audioEngine.audioContext;
        this.sound = audioContext.createBufferSource();
        this.sound.connect(audioContext.destination);
        this.sound.buffer = this.replayBuf;    
        this.sound.start();
    }

    setAudioInput (args) {
        this.audioInput = args.INPUT;
    }

    connectMicInput() {
        if (typeof this.runtime.audioEngine === 'undefined') return;
        const audioContext = this.runtime.audioEngine.audioContext;

        // The microphone has not been set up, so try to connect to it
        if (!this.mic && !this.connectingToMic) {
            this.connectingToMic = true; // prevent multiple connection attempts
            navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
                this.audioStream = stream;
                this.mic = audioContext.createMediaStreamSource(stream);
                this.analyserMic = audioContext.createAnalyser();
                this.analyserMic.fftSize = 2048;
                this.analyserMic.smoothingTimeConstant = 0.2;
                this.mic.connect(this.analyserMic);
                this.frequencyArrayMic = new Uint8Array(this.analyserMic.frequencyBinCount);

            })
            .catch(err => {
                log.warn(err);
            });
        }
    }

    /**
     * Analyze based on step time. True on no errors.
     * @returns {boolean} whether step time is defined.
     * @private
     */
    conservativeAnalyze() {
        if (typeof this.runtime.currentStepTime === 'undefined') return false;

        const timeSinceSpectrum = this.timer.time() - this.spectrumTime;
        if (timeSinceSpectrum > this.runtime.currentStepTime) {
            // 1/30 sec. ~ 33ms (scratch step time)
            // 2048/48000 ~ 43ms (audio )
            this.spectrumTime = this.timer.time();
            this.analyze();
            // console.log(this.soundBuf);
        }

        return true;
    }

    analyze () {
        if (typeof this.runtime.audioEngine === 'undefined') return;
        const audioContext = this.runtime.audioEngine.audioContext;
        // debugger;

        // master gain
        this.inputNode = this.runtime.audioEngine.inputNode;

        switch (this.audioInput) { // Stored parts of frequency array into energy array, based on desired band.
            case 'microphone':
                this.connectMicInput();
                break;
            case 'project':
                break;
            case 'all':
                this.connectMicInput();
                break;
        }

        if(!this.started) {
            this.analyser = audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.sampleRate = audioContext.sampleRate;
            // console.log(this.sampleRate);
            this.analyser.smoothingTimeConstant = 0.2;
            this.inputNode.connect(this.analyser);
            this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

            // For sliding mean
            this.slidingAvg = new SlidingArray(7, 3, 'avg');

            // this.slidingAvgArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
            // this.slidingAvgOrder = 6; // order of sliding avg = size - 1
            // this.slidingAvgIndex = 0;
            // this.slidingAvgResultArray = (new Array(3)).fill(0); // calibrating average

            // For sliding standard dev
            this.slidingVar = new SlidingArray(7, 3, 'var');

            // this.slidingStdArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
            // this.slidingStdOrder = 6; // order of sliding std = size - 1
            // this.slidingStdIndex = 0;
            // this.diffEnergyStdArray = (new Array(3)).fill(0); // current squared differences
            // this.slidingStdResultArray = (new Array(3)).fill(0); // calibrating standard dev

            this.avgEnergyArray = (new Array(3)).fill(0);

            // EnergyArr calculation setup
            this.hzCutoff = { // Three band thresholds in Hertz https://www.teachmeaudio.com/mixing/techniques/audio-spectrum/
                'low': 250,
                'mid': 2000,
                'high': 6000,
            };
            this.bandValues = { // Three band thresholds. Nth bin corresponds to N*(sample rate [48 k])/(FFT size) Hz
                'low': [0, Math.round(this.hzCutoff['low'] * this.analyser.fftSize / this.sampleRate)],
                'mid': [Math.round(this.hzCutoff['low'] * this.analyser.fftSize / this.sampleRate), Math.round(this.hzCutoff['mid'] * this.analyser.fftSize / this.sampleRate)],
                'high': [Math.round(this.hzCutoff['mid'] * this.analyser.fftSize / this.sampleRate), Math.round(this.hzCutoff['high'] * this.analyser.fftSize / this.sampleRate)],
            };
            this.bandIndex = {
                'low': 0,
                'mid': 1,
                'high': 2
            };

            // Sound replay setup
            // this.soundBuf = new Array(2).fill(0).map(() => new Float32Array(4096).fill(0));
            this.soundBuf;
            this.replayBuf;
            var scriptNode = audioContext.createScriptProcessor(4096, 2, 2);
            scriptNode.connect(audioContext.destination);
            this.inputNode.connect(scriptNode);
            
            scriptNode.onaudioprocess = function(audioProcessingEvent) {
                // The input buffer is the song we loaded earlier
                var inputBuffer = audioProcessingEvent.inputBuffer;
                this.soundBuf = inputBuffer;
            
                // The output buffer contains the samples that will be modified and played
                // var outputBuffer = audioProcessingEvent.outputBuffer;
            
                // // Loop through the output channels (in this case there is only one)
                // for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
                //     var inputData = inputBuffer.getChannelData(channel);
                //     var outputData = outputBuffer.getChannelData(channel);
                
                //     // Loop through the 4096 samples
                //     for (var sample = 0; sample < inputBuffer.length; sample++) {
                //         // make output equal to the same as the input
                //         // outputData[sample] = inputData[sample];
                //         // this.soundBuf[channel][sample] = inputData[sample];
                //     }
                // }
            }.bind(this)

            this.spectralFlux = 0;

            this.started = true;
        }

        // If the microphone is set up and active, analyze the spectrum
        if (this.mic && this.audioStream.active) {
            this.analyserMic.getByteFrequencyData(this.frequencyArrayMic);
        }

        // Refresh project sound frequencies
        this.frequencyArrayOld = this.frequencyArray.slice()
        this.analyser.getByteFrequencyData(this.frequencyArray);

        // Spectral flux
        this.spectralFlux = 0;
        for( var i = 0; i < this.frequencyArray.length; i++ ){
            this.spectralFlux += Math.abs(this.frequencyArray[i] - this.frequencyArrayOld[i]);
        }

        // Update average energy

        let energyArr = [];
        for (let band of ['low', 'mid', 'high']) {
            switch (this.audioInput) { // Stored parts of frequency array into energy array, based on desired band.
                case 'microphone':
                    energyArr = this.frequencyArrayMic.slice(this.bandValues[band][0],this.bandValues[band][1]);
                    break;
                case 'project':
                    energyArr = this.frequencyArray.slice(this.bandValues[band][0],this.bandValues[band][1]);
                    break;
                case 'all':
                    energyArr = this.frequencyArray.slice(this.bandValues[band][0],this.bandValues[band][1]);
                    for( var i = 0; i < energyArr.length; i++ ){
                        energyArr[i] = Math.max(energyArr[i], this.frequencyArrayMic.slice(this.bandValues[band][0],this.bandValues[band][1])[i])
                    }
                    break;
            }
            // Store average energies into avgEnergyArray, low average at index 0, and mid, high, etc.
            var sum = 0;
            for( var i = 0; i < energyArr.length; i++ ){
                sum += energyArr[i];
            }

            // Trial here to output nearby averages for the bands, equalizing heights across bands
            this.avgEnergyArray[this.bandIndex[band]] = sum / energyArr.length;
            // this.avgEnergyArray[this.bandIndex[band]] = sum;

            // this.avgEnergyArray[bandIndex[band]] = Math.round(energyArr.reduce((a,b)=>a+b,0) / energyArr.length);
        }

        // // Sliding avg filter
        // for (var band=0; band<3; band++) {
        //     this.slidingAvgResultArray[band] += (this.avgEnergyArray[band] - this.slidingAvgArray[this.slidingAvgIndex][band])/(this.slidingAvgOrder + 1);
        // }
        // // Copy current avg energy into the right index of sliding array
        // this.slidingAvgArray[this.slidingAvgIndex].splice(0, this.slidingAvgArray[this.slidingAvgIndex].length, ...this.avgEnergyArray);
        // this.slidingAvgIndex = (this.slidingAvgIndex + 1)%(this.slidingAvgOrder + 1);
        this.slidingAvgResultArray = this.slidingAvg.step({current: this.avgEnergyArray});
        
        // Sliding std filter and some std computation
        // for (var band=0; band<3; band++) {
        //     this.diffEnergyStdArray[band] = (this.avgEnergyArray[band] - this.slidingAvgResultArray[band])**2;
        //     this.slidingStdResultArray[band] = Math.sqrt(Math.abs(this.slidingStdResultArray[band]**2 + ((this.diffEnergyStdArray[band] - this.slidingStdArray[this.slidingStdIndex][band]) / this.slidingStdOrder)));
        // }
        // // Copy current avg energy difference into the right index of sliding array
        // this.slidingStdArray[this.slidingStdIndex].splice(0, this.slidingStdArray[this.slidingStdIndex].length, ...this.diffEnergyStdArray);
        // this.slidingStdIndex = (this.slidingStdIndex + 1)%(this.slidingStdOrder + 1);
        
        this.slidingStdResultArray = this.slidingVar.step({current: this.avgEnergyArray, average: this.slidingAvgResultArray});
    }

    /**
     * The "clear" block clears the sound arrays' contents.
     */
    clear () {
        // For sliding mean
        this.slidingAvg.clear();
        // this.slidingAvgArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
        // this.slidingAvgResultArray = (new Array(3)).fill(0); // calibrating average

        // For sliding standard dev
        this.slidingVar.clear();
        // this.slidingStdArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
        // this.diffEnergyStdArray = (new Array(3)).fill(0); // current squared differences
        // this.slidingStdResultArray = (new Array(3)).fill(0); // calibrating standard dev

        this.avgEnergyArray = (new Array(3)).fill(0);
    }
}

module.exports = Scratch3SoundSensingBlocks;