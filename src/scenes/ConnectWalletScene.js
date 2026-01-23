import Phaser from "phaser";
import { connectWallet } from "../web3/wallet";

export default class ConnectWalletScene extends Phaser.Scene {
  constructor() {
    super("ConnectWalletScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x05050a, 0.95);

    this.add.text(width / 2, height / 2 - 80, "CONNECT WALLET", {
      fontFamily: "monospace",
      fontSize: "40px",
      color: "#00ff99",
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, height / 2 - 10, "Press ENTER to connect", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 40, "You must connect MetaMask to play.", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#aaaaaa",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 120, "(ESC to quit)", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#666666",
    }).setOrigin(0.5);

    // ENTER to connect
    this.input.keyboard.on("keydown-ENTER", () => this.doConnect());
    // Click anywhere to connect
    this.input.on("pointerdown", () => this.doConnect());

    // When wallet connects elsewhere
    window.addEventListener("wallet-connected", this.onConnected);
  }

  onConnected = (e) => {
    const address = e.detail?.address;
    this.statusText.setText(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}\nLoading...`);
    this.time.delayedCall(400, () => {
      this.scene.start("TitleScene");
    });
  };

  async doConnect() {
    if (window.WEB3?.connected) {
      this.scene.start("TitleScene");
      return;
    }

    this.statusText.setText("Opening wallet...");
    try {
      const address = await connectWallet();
      if (!address) {
        this.statusText.setText("Connection cancelled. Press ENTER to try again.");
        return;
      }

      window.WEB3.connected = true;
      window.WEB3.address = address;
      window.dispatchEvent(new CustomEvent("wallet-connected", { detail: { address } }));
    } catch (err) {
      this.statusText.setText(`Error: ${err?.message || err}\nPress ENTER to retry.`);
    }
  }

  shutdown() {
    window.removeEventListener("wallet-connected", this.onConnected);
  }
}
