import crypto from "crypto";

interface IpaymuInitParams {
  orderId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentMethod?: string;
  returnUrl: string;
  notifyUrl: string;
}

export class IpaymuProvider {
  private va: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.va = process.env.IPAYMU_VA || "";
    this.apiKey = process.env.IPAYMU_API_KEY || "";
    this.baseUrl = process.env.IPAYMU_BASE_URL || "https://sandbox.ipaymu.com/api/v2";

    if (!this.va || !this.apiKey) {
      console.warn("iPaymu credentials are not fully configured in environment variables.");
    }
  }

  private generateSignature(body: string): string {
    const hashBody = crypto.createHash("sha256").update(body).digest("hex");
    const stringToSign = `POST:${this.va}:${hashBody}:${this.apiKey}`;
    return crypto.createHmac("sha256", this.apiKey).update(stringToSign).digest("hex");
  }

  async createTransaction(params: IpaymuInitParams) {
    const endpoint = `${this.baseUrl}/payment`;
    
    const bodyData = {
      product: [params.orderId],
      qty: [1],
      price: [params.amount],
      description: [`Order #${params.orderId}`],
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
      cancelUrl: params.returnUrl,
      referenceId: params.orderId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      paymentMethod: params.paymentMethod || "",
    };

    const bodyString = JSON.stringify(bodyData);
    const signature = this.generateSignature(bodyString);
    timestamp: Date.now().toString()

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        va: this.va,
        signature: signature,
        timestamp: Math.floor(Date.now() / 1000).toString(),
      },
      body: bodyString,
    });

    const result = await response.json();

    if (!response.ok || result.status !== 200) {
      throw new Error(result.message || "Failed to create iPaymu transaction");
    }

    return result.data; // Mengembalikan url, paymentNo, qrImage, dll.
  }

  verifyCallbackSignature(reqBody: unknown, signatureHeader: string): boolean {
    // Implementasi verifikasi callback sesuai standar dokumentasi iPaymu
    const computedSignature = crypto
      .createHmac("sha256", this.apiKey)
      .update(JSON.stringify(reqBody))
      .digest("hex");

    return computedSignature === signatureHeader;
  }
}