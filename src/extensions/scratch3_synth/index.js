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
class Scratch3SynthBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.timer = new Timer();
        this.spectrumTime = this.timer.time();
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
            id: 'synth',
            name: 'Spectrum',
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'whenPeakSliding',
                    text: formatMessage({
                        id: 'synth.whenPeakSliding',
                        default: 'when [BAND] sound played',
                        description: 'check when audio peaks, calibratedly, in a range'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        BAND: {
                            type: ArgumentType.STRING,
                            menu: 'bands',
                            defaultValue: 'bass'
                        }
                    }
                },
                {
                    opcode: 'get3Band',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'synth.get3Band',
                        default: 'loudness of [BAND]',
                        description: 'get the energy in the requested three frequency band index'
                    }),
                    arguments: {
                        BAND: {
                            type: ArgumentType.STRING,
                            menu: 'bands',
                            defaultValue: 'bass'
                        }
                    }
                },
                // {
                //     opcode: 'get3BandSliding',
                //     blockType: BlockType.REPORTER,
                //     text: formatMessage({
                //         id: 'synth.get3BandAvg',
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
                //         id: 'synth.whenPeak',
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
                        id: 'synth.setAudioInput',
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
                    opcode: 'getBand',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'synth.getBand',
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

        if(this.slidingStdResultArray[bandIndex[band]] != 0) {
            var norm = (this.avgEnergyArray[bandIndex[band]] - this.slidingAvgResultArray[bandIndex[band]]) / this.slidingStdResultArray[bandIndex[band]];
            // console.log(band + ':\t' + norm);
            return norm > 1; // Use mean difference array!
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

        let bandNum = Cast.toNumber(band);
        bandNum = MathUtil.clamp(bandNum, 1, this.frequencyArray.length);
        let energy = this.frequencyArray[bandNum - 1];
        energy = (energy / 255) * 100;

        return energy;
    }

    setAudioInput (args) {
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
            console.log(this.spectrumTime);
            this.analyze();
        }

        return true;
    }

    analyze () {
        if (typeof this.runtime.audioEngine === 'undefined') return;
        const audioContext = this.runtime.audioEngine.audioContext;
        // debugger;

        // master gain
        this.inputNode = this.runtime.audioEngine.inputNode;

        // // The microphone has not been set up, so try to connect to it
        // if (!this.mic && !this.connectingToMic) {
        //     this.connectingToMic = true; // prevent multiple connection attempts
        //     navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        //         this.audioStream = stream;
        //         this.mic = audioContext.createMediaStreamSource(stream);
        //         this.analyser = audioContext.createAnalyser();
        //         this.analyser.fftSize = 1024;
        //         this.analyser.smoothingTimeConstant = 0.2;
        //         this.mic.connect(this.analyser);
        //         this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

        //     })
        //         .catch(err => {
        //             log.warn(err);
        //         });
        // }
        if(!this.started) {
            this.analyser = audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.2;
            this.inputNode.connect(this.analyser);
            this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

            // For sliding mean
            this.slidingAvgArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
            this.slidingAvgOrder = 6; // order of sliding avg = size - 1
            this.slidingAvgIndex = 0;
            this.slidingAvgResultArray = (new Array(3)).fill(0); // calibrating average

            // For sliding standard dev
            this.slidingStdArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
            this.slidingStdOrder = 6; // order of sliding std = size - 1
            this.slidingStdIndex = 0;
            this.diffEnergyStdArray = (new Array(3)).fill(0); // current squared differences
            this.slidingStdResultArray = (new Array(3)).fill(0); // calibrating standard dev

            this.avgEnergyArray = (new Array(3)).fill(0);
            this.started = true;
        }

        // If the microphone is set up and active, analyze the spectrum
        // if (this.mic && this.audioStream.active) {
        //     this.analyser.getByteFrequencyData(this.frequencyArray);
        // }
        
        // Refresh frequencies
        this.analyser.getByteFrequencyData(this.frequencyArray);
        // console.log(this.frequencyArray);

        // Update average energy
        let energyArr = [];
        let bandValues = { // Three band thresholds.
            'low': 13,
            'mid': 150
        };
        let bandIndex = {
            'low': 0,
            'mid': 1,
            'high': 2
        };
        for (let band of ['low', 'mid', 'high']) {
            switch (band) { // Stored parts of frequency array into energy array, based on desired band.
                case 'low':
                    energyArr = this.frequencyArray.slice(0,bandValues['low']);
                    break;
                case 'mid':
                    energyArr = this.frequencyArray.slice(bandValues['low'],bandValues['mid']);
                    break;
                case 'high':
                    energyArr = this.frequencyArray.slice(bandValues['mid'],this.frequencyArray.length);
                    break;
            }
            // Store average energies into avgEnergyArray, low average at index 0, and mid, high, etc.
            var sum = 0;
            for( var i = 0; i < energyArr.length; i++ ){
                sum += energyArr[i];
            }
            // if(Math.abs(sum/energyArr.length - this.avgEnergyArray[bandIndex[band]]) < 1) {
            //     console.log(Math.abs(sum/energyArr.length - this.avgEnergyArray[bandIndex[band]]));
            // }
            this.avgEnergyArray[bandIndex[band]] = sum/energyArr.length;

            // this.avgEnergyArray[bandIndex[band]] = Math.round(energyArr.reduce((a,b)=>a+b,0) / energyArr.length);
        }
        
        // Sliding avg filter
        for (var band=0; band<3; band++) {
            this.slidingAvgResultArray[band] += (this.avgEnergyArray[band] - this.slidingAvgArray[this.slidingAvgIndex][band])/(this.slidingAvgOrder + 1);
        }
        // Copy current avg energy into the right index of sliding array
        this.slidingAvgArray[this.slidingAvgIndex].splice(0, this.slidingAvgArray[this.slidingAvgIndex].length, ...this.avgEnergyArray);
        this.slidingAvgIndex = (this.slidingAvgIndex + 1)%(this.slidingAvgOrder + 1);
        
        // Sliding std filter and some std computation
        for (var band=0; band<3; band++) {
            this.diffEnergyStdArray[band] = (this.avgEnergyArray[band] - this.slidingAvgResultArray[band])**2;
            this.slidingStdResultArray[band] = Math.sqrt(this.slidingStdResultArray[band]**2 + ((this.diffEnergyStdArray[band] - this.slidingStdArray[this.slidingStdIndex][band]) / this.slidingStdOrder));
        }
        // Copy current avg energy difference into the right index of sliding array
        this.slidingStdArray[this.slidingStdIndex].splice(0, this.slidingStdArray[this.slidingStdIndex].length, ...this.diffEnergyStdArray);
        this.slidingStdIndex = (this.slidingStdIndex + 1)%(this.slidingStdOrder + 1);
    }

    /**
     * The "clear" block clears the sound arrays' contents.
     */
    clear () {
        // For sliding mean
        this.slidingAvgArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
        this.slidingAvgResultArray = (new Array(3)).fill(0); // calibrating average

        // For sliding standard dev
        this.slidingStdArray = new Array(7).fill(0).map(() => new Array(3).fill(0)); // best way to create 2d array
        this.diffEnergyStdArray = (new Array(3)).fill(0); // current squared differences
        this.slidingStdResultArray = (new Array(3)).fill(0); // calibrating standard dev

        this.avgEnergyArray = (new Array(3)).fill(0);
    }
}

module.exports = Scratch3SynthBlocks;