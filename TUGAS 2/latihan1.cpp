#include <iostream>
#include <string>

using namespace std;

// Struktur untuk sebuah node dalam single linked list
struct Node {
    string nama;
    int nilai;
    Node* next; 
};

// Pointer 'head' untuk menandai awal dari linked list
Node* head = nullptr;

// Prosedur untuk menambah data 
void insertFirst(string nama, int nilai) {
    // Membuat node baru.
    Node* newNode = new Node;
    newNode->nama = nama;
    newNode->nilai = nilai;
    newNode->next = nullptr; // Node baru akan menjadi yang terakhir.

    // Jika list masih kosong, node baru menjadi head.
    if (head == nullptr) {
        head = newNode;
    } else {
        // Jika tidak kosong, cari node terakhir.
        Node* current = head;
        while (current->next != nullptr) {
            current = current->next; // Berjalan ke node selanjutnya.
        }
        // menyambung node terakhir ke node yang baru dibuat.
        current->next = newNode;
    }
}

// Prosedur unt menampilkan semua data dalam list.
void tampilkanData() {
    Node* current = head; // Mulai dari awal list.

    if (current == nullptr) {
        cout << "Data masih kosong." << endl;
        return;
    }
    
    cout << "\n--- Data Nilai Siswa ---" << endl;
    while (current != nullptr) {
        // Cetak data 
        cout << "Nama: " << current->nama << ", Nilai: " << current->nilai << endl;
        // Pindah ke node selanjutnya.
        current = current->next;
    }
    cout << "------------------------" << endl;
}

int main() {
    int pilihan;
    string nama;
    int nilai;

    // do-while untk menampilkan menu selama pengguna tidak memilih keluar.
    do {
        cout << "\n===== MENU =====" << endl;
        cout << "1. Tambah Data" << endl;
        cout << "2. Tampilkan Data" << endl;
        cout << "3. Keluar" << endl;
        cout << "Pilih: ";
        cin >> pilihan;

        if (pilihan == 1) {
            cout << "Masukkan Nama: ";
            cin.ignore(); // Membersihkan input sblmny
            getline(cin, nama); // Membaca seluruh baris nama.

            cout << "Masukkan Nilai: ";
            cin >> nilai;

            insertFirst(nama, nilai); // Memanggil fungsi untuk menambah data.
            cout << "Data berhasil ditambahkan." << endl;
        } else if (pilihan == 2) {
            tampilkanData(); // Memanggil fungsi untuk menampilkan data.
        }

    } while (pilihan != 3);

    return 0;
}