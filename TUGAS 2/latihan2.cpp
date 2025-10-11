#include <iostream>
using namespace std;

typedef int infotype;
struct Node;
typedef Node* address;

struct Node {
    infotype info;
    address next;
};

struct List {
    address first;
};

//alokasi node baru
address Allocation(infotype x) {
    address NewElmt = new Node;
    NewElmt->info = x;
    NewElmt->next = nullptr;
    return NewElmt;
}

//mengecek list kosong
bool IsEmpty(List L) {
    return L.first == nullptr;
}

//insert first
void InsertFirst(List *L, infotype x) {
    address NewElmt;
    NewElmt = Allocation(x);
    NewElmt->next = L->first;
    L->first = NewElmt;
}

//insert after
void InsertAfter(address PredElmt, infotype x) {
    if (PredElmt == nullptr) return;
    address NewElmt;
    NewElmt = Allocation(x);
    NewElmt->next = PredElmt->next;
    PredElmt->next = NewElmt;
}

//insert sorted untuk mengurutkan input dari user
void InsertSorted(List *L, infotype x) {
    if (IsEmpty(*L) || L->first->info > x) {
        InsertFirst(L, x);
    } else {
        address temp = L->first;
        
        while (temp->next != NULL && temp->next->info < x) {
            temp = temp->next;
        }
        
        InsertAfter(temp, x);
    }
}

void createList(List *L) {
    L->first = nullptr;
}

void printList(List L) {
    if (IsEmpty(L)) {
        cout << "List masih kosong." << endl;
        return;
    }
    address current = L.first;
    cout << "Isi List Terurut: ";
    while (current != nullptr) {
        cout << current->info << " -> ";
        current = current->next;
    }
    cout << "NULL" << endl;
}

int main() {
    List myList;
    List *pList = &myList;
    createList(pList);
    
    int nilai;
    cout << "===== Program Input Sorted List =====" << endl;
    cout << "Masukkan angka terus-menerus." << endl;
    cout << "Ketik 999 lalu Enter untuk berhenti." << endl;

    while (true) {
        cout << "Masukkan angka: ";
        cin >> nilai;

        if (nilai == 999) {
            break;
        }
        
        InsertSorted(pList, nilai);
    }

    cout << "\nProses input selesai." << endl;
    printList(myList);

    return 0;
}