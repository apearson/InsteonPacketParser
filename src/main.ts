/* Libraries */
import {Transform} from 'stream';
import {Packets, Packet, PacketID} from './Packets';

/* Exports */
export {InsteonParser, Packets, Packet, PacketID};

class InsteonParser extends Transform{
  /* Internal Variables */
  private debug: boolean;
  private started: boolean;
  private type: number | undefined;
  private packet: Packet;

  constructor(options = {debug: false, objectMode: true}){
    super(options);

    /* Parser internal variables */
    this.debug = options.debug;
    this.started = false;
    this.type = null;
    this.packet = null;
  }
  
  _transform(chunk: Buffer, encoding: string, completed: ()=> void){
    if(this.debug){
      console.info(`Got chunk: ${chunk}`);
    }

    /* Splitting chunk into bytes and parsing each individually  */
    for(let i = 0; i < chunk.length; i++){
      this._parseByte(chunk.readUInt8(i));
    }

    /* Telling stream provider we have consumed the provided bytes with no errors*/
    completed();
    
    if(this.debug){
      console.info('\n');
    }
  }
  _parseByte(byte: number){
    let command;

    /* Determing what needs to happen in packet */
    if(!this.started && byte === 0x02){
      command = 'Starting Packet';
      this.started = true;
    }
    else if(this.started && this.type == null){
      command = 'Grabbing packet type';
      this.type = byte;
      this.packet = new Packets[byte]();
    }
    else if(this.started && this.packet != null && !this.packet.completed){
      command = 'Grabbing packet info';
      this.packet.parse(byte);
    }
    else{
      command = 'Unknown Data';
    }
    
    /* Debug Print out */
    if(this.debug){
      console.info(`Processing: 0x${('0'+(byte).toString(16)).slice(-2).toUpperCase()}, Command: ${command}`);
    }

    /* Checking for packet completed */
    if(this.packet != null && this.packet.completed){
      /* Sending completed packet upstream */
      this.push(this.packet.packet);

      /* Reseting environment for next packet */
      this.started = false;
      this.type = null;
      this.packet = null;
    }
  }
};