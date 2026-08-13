// Helper untuk memformat dan mencetak struk secara langsung ke printer thermal Bluetooth (ESC/POS)
export async function connectAndPrintReceipt(receipt: any, storeName: string, storeDescription: string | null) {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Web Bluetooth hanya tersedia di sisi client (browser).');
    }

    const navAny = navigator as any;
    if (!navAny.bluetooth) {
      throw new Error('Browser Anda tidak mendukung Web Bluetooth. Gunakan Google Chrome di Android atau Desktop.');
    }

    // 1. Request Bluetooth Device (Mencari printer thermal bluetooth)
    const device = await navAny.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Printer' },
        { namePrefix: 'PT-210' },
        { namePrefix: 'MPT-II' },
        { namePrefix: 'POS' }
      ],
      // Layanan serial standard generic dan print common UUIDs
      optionalServices: ['00001101-0000-1000-8000-00805f9b34fb', '000018f0-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Gagal menghubungkan ke GATT server printer.');

    // 2. Cari Primary Service (UUID standard BLE print atau SPP)
    let service;
    try {
      service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    } catch {
      try {
        service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
      } catch {
        // Fallback: ambil service pertama jika UUID tidak tepat
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          service = services[0];
        } else {
          throw new Error('Service printer tidak ditemukan.');
        }
      }
    }

    // 3. Dapatkan karakteristik write
    const characteristics = await service.getCharacteristics();
    const characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
    if (!characteristic) throw new Error('Karakteristik penulisan (write) printer tidak ditemukan.');

    // 4. Inisialisasi format perintah byte ESC/POS
    const encoder = new TextEncoder();
    const ESC = 0x1B;
    const GS = 0x1D;

    const init = new Uint8Array([ESC, 0x40]); // Inisialisasi printer
    const center = new Uint8Array([ESC, 0x61, 1]); // Teks tengah
    const left = new Uint8Array([ESC, 0x61, 0]); // Teks kiri
    const boldOn = new Uint8Array([ESC, 0x45, 1]); // Tebal On
    const boldOff = new Uint8Array([ESC, 0x45, 0]); // Tebal Off
    const feedAndCut = new Uint8Array([10, 10, 10, 10, GS, 0x56, 66, 0]); // Newlines + cut paper

    const printLine = (text: string) => encoder.encode(text + '\n');

    const chunks: Uint8Array[] = [];
    chunks.push(init);
    
    // Header Toko
    chunks.push(center, boldOn);
    chunks.push(printLine(storeName.toUpperCase()));
    chunks.push(boldOff);
    if (storeDescription) {
      chunks.push(printLine(storeDescription));
    }
    chunks.push(printLine('--------------------------------')); // Batas lebar 32 kolom kertas 58mm

    // Informasi Struk
    chunks.push(left);
    chunks.push(printLine(`No: ${receipt.transaction_number}`));
    const formattedDate = new Date(receipt.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    chunks.push(printLine(`Tgl: ${formattedDate}`));
    chunks.push(printLine(`Metode: ${receipt.payment_method === 'CASH' ? 'TUNAI' : 'QRIS'}`));
    chunks.push(printLine('--------------------------------'));

    // Daftar Item Belanjaan
    receipt.transaction_items.forEach((item: any) => {
      chunks.push(printLine(item.product_name_snapshot));
      const qtyPrice = `${item.quantity} x ${Number(item.price_snapshot).toLocaleString('id-ID')}`;
      const subtotal = Number(item.subtotal).toLocaleString('id-ID');
      
      // Hitung spasi untuk meratakan subtotal di kanan (lebar 32 karakter)
      const spaceCount = 32 - qtyPrice.length - subtotal.length;
      const spaces = ' '.repeat(Math.max(1, spaceCount));
      chunks.push(printLine(`${qtyPrice}${spaces}${subtotal}`));
    });
    chunks.push(printLine('--------------------------------'));

    // Pembayaran & Total
    const formatRow = (label: string, value: number) => {
      const valStr = Number(value).toLocaleString('id-ID');
      const spaceCount = 32 - label.length - valStr.length;
      const spaces = ' '.repeat(Math.max(1, spaceCount));
      return `${label}${spaces}${valStr}`;
    };

    chunks.push(boldOn);
    chunks.push(printLine(formatRow('TOTAL:', receipt.total_amount)));
    chunks.push(boldOff);
    chunks.push(printLine(formatRow('Bayar:', receipt.paid_amount)));
    chunks.push(printLine(formatRow('Kembali:', receipt.change_amount)));
    chunks.push(printLine('--------------------------------'));

    // Footer Struk
    chunks.push(center);
    chunks.push(printLine('Terima Kasih atas Kunjungan Anda'));
    chunks.push(printLine('Powered by POS UMKM'));
    chunks.push(feedAndCut);

    // Satukan semua byte chunks
    let totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    let dataBuffer = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      dataBuffer.set(chunk, offset);
      offset += chunk.length;
    });

    // Kirim data dalam batch kecil (20 byte) untuk mencegah buffer overflow pada GATT Bluetooth
    const CHUNK_SIZE = 20;
    for (let i = 0; i < dataBuffer.length; i += CHUNK_SIZE) {
      const subChunk = dataBuffer.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(subChunk);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Bluetooth Print Error:', err);
    return { error: err.message || 'Gagal mengirimkan perintah cetak.' };
  }
}
