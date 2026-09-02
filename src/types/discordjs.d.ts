declare module 'discord.js' {
  interface PartialGroupDMChannel {
    send(...args: any[]): Promise<any>;
  }
}
