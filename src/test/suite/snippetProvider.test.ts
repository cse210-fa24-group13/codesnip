import * as assert from 'assert';
import { SnippetsProvider } from '../../provider/snippetsProvider';
import { SnippetService } from '../../service/snippetService';
import { DataAccess } from '../../data/dataAccess';
import { Snippet } from '../../interface/snippet';

suite('SnippetsProvider Tests', () => {
  let snippetsProvider: SnippetsProvider;

  class MockDataAccess implements DataAccess {
    private _data: Snippet = {
      id: 1,
      label: 'Root',
      children: [],
    };

    hasNoChild(): boolean {
      return !this._data.children || this._data.children.length === 0;
    }

    load(): Snippet {
      return this._data;
    }

    save(data: Snippet): void {
      this._data = data;
    }
  }

  // Mock the SnippetService for testing
  class MockSnippetService extends SnippetService {
    constructor() {
      super(new MockDataAccess()); // Pass null and empty array for constructor arguments
    }
    
    // Mock the methods you need for testing
    refresh(): void {
      // Mock the refresh method
    }

    sync(): void {
      // Mock the sync method
    }

    // Mock other methods as needed
  }

  setup(() => {
    // Create a new instance of SnippetsProvider with a mock SnippetService
    snippetsProvider = new SnippetsProvider(new MockSnippetService(), []);
  });

  test('AddSnippet adds a snippet correctly', async () => {
    // Arrange
    const name = 'New Snippet';
    const snippet = 'console.log("Hello, World!");';
    const parentId = 1;

    // Act
    snippetsProvider.addSnippet(name, snippet, parentId);

    // Assert
    const allSnippets = await snippetsProvider.getChildren();
    assert.strictEqual(allSnippets.length, 1);
    assert.strictEqual(allSnippets[0].label, name);
    assert.strictEqual(allSnippets[0].value, snippet);
  });

  test('RemoveSnippet removes a snippet correctly', async () => {
    // Arrange
    const name = 'New Snippet';
    const snippet = 'console.log("Hello, World!");';
    const parentId = 1;
    snippetsProvider.addSnippet(name, snippet, parentId);

    // Act
    let allSnippets = await snippetsProvider.getChildren();
    snippetsProvider.removeSnippet(allSnippets[0]);

    // Assert
    allSnippets = await snippetsProvider.getChildren();
    assert.strictEqual(allSnippets.length, 0);
  });
  test('AddSnippetFolder adds a folder correctly', async () => {
    // Arrange
    const name = 'New Folder';
    const parentId = 1;

    // Act
    snippetsProvider.addSnippetFolder(name, parentId);

    // Assert
    const allSnippets = await snippetsProvider.getChildren();
    assert.strictEqual(allSnippets.length, 1);
    assert.strictEqual(allSnippets[0].label, name);
    assert.strictEqual(allSnippets[0].folder, true);
  });

  test('editSnippet/Folder edits a snippet/folder correctly', async () => {
   // Arrange
   const updatedSnippetfile: Snippet = {
     id: 1,
     label: 'Updated Snippet',
     value: 'Updated Content',
     folder: false,
     children: [],
   };
   
   const updatedSnippetfolder: Snippet = {
     id: 2,
     label: 'Updated Folder',
     value: 'New Value', 
     folder: true,
     children: [],
   };
   snippetsProvider.addSnippet("Old Snippet","Old Content",1);
   snippetsProvider.addSnippetFolder("Old Folder",1);

   // Act
   snippetsProvider.editSnippet(updatedSnippetfile);
   snippetsProvider.editSnippetFolder(updatedSnippetfolder);
 
   // Assert
   const allSnippets = await snippetsProvider.getChildren();
   assert.strictEqual(allSnippets[0].label, 'Updated Snippet');
   assert.deepStrictEqual(allSnippets[0].value, 'Updated Content');
   assert.strictEqual(allSnippets[1].label, 'Updated Folder');
   assert.deepStrictEqual(allSnippets[1].value, undefined); // Value should remain unchanged for folders
 });

 test('editSnippet/Folder should not edit an unexisting snippet/folder', async () => {
   // Arrange
  const updatedSnippetfile: Snippet = {
    id: 3,
    label: 'Updated Snippet',
    value: 'Updated Content',
    folder: false,
    children: [],
  };
  const updatedSnippetfolder: Snippet = {
    id: 4,
    label: 'Updated Folder',
    value: 'New Value', 
    folder: true,
    children: [],
  };
  
  snippetsProvider.addSnippet("Old Snippet","Old Content",1);
  snippetsProvider.addSnippetFolder("Old Folder",1);

  // Act
  snippetsProvider.editSnippet(updatedSnippetfile);
  snippetsProvider.editSnippetFolder(updatedSnippetfolder)

  // Assert
  const allSnippets = await snippetsProvider.getChildren();
  assert.strictEqual(allSnippets[0].label, "Old Snippet");
  assert.deepStrictEqual(allSnippets[0].value, "Old Content");
  assert.strictEqual(allSnippets[1].label, "Old Folder");
  assert.strictEqual(allSnippets[1].folder, true);
  assert.deepStrictEqual(allSnippets[1].value, undefined);
});


 test('moveSnippetDown moves down a snippet correctly', async () => {
   // Arrange
   const newSnippet1: Snippet = {
     id: 1,
     label: 'First Snippet',
     value: 'First Content',
     folder: false,
     children: []
   };

   const newSnippet2: Snippet = {
     id: 2,
     label: 'Second Snippet',
     value: 'Second Content',
     children: [],
     folder: false
   };
   snippetsProvider.addSnippet("First Snippet","Fisrt Content",1);
   snippetsProvider.addSnippet("Second Snippet","Second Content",1);

   // Act
   snippetsProvider.moveSnippetDown(newSnippet1)

   // Assert
   const allSnippets = await snippetsProvider.getChildren();
   assert.strictEqual(allSnippets[0].id, 2);
   assert.strictEqual(allSnippets[1].id, 1);
 });
 
 test('moveSnippetUp moves up a snippet correctly', async () => {
   // Arrange
   const newSnippet1: Snippet = {
     id: 1,
     label: 'First Snippet',
     value: 'First Content',
     folder: false,
     children: []
   };

   const newSnippet2: Snippet = {
     id: 2,
     label: 'Second Snippet',
     value: 'Second Content',
     children: [],
     folder: false
   };
   snippetsProvider.addSnippet("First Snippet","Fisrt Content",1);
   snippetsProvider.addSnippet("Second Snippet","Second Content",1);

   // Act
   snippetsProvider.moveSnippetUp(newSnippet2)

   // Assert
   const allSnippets = await snippetsProvider.getChildren();
   assert.strictEqual(allSnippets[0].id, 2);
   assert.strictEqual(allSnippets[1].id, 1);
 });

 test('moveSnippetDown/Up should not move a snippet when out of bound', async () => {
  // Arrange
  const newSnippet1: Snippet = {
    id: 1,
    label: 'First Snippet',
    value: 'First Content',
    folder: false,
    children: []
  };

  const newSnippet2: Snippet = {
    id: 2,
    label: 'Second Snippet',
    value: 'Second Content',
    children: [],
    folder: false
  };
  snippetsProvider.addSnippet("First Snippet","Fisrt Content",1);
  snippetsProvider.addSnippet("Second Snippet","Second Content",1);

  // Act
  snippetsProvider.moveSnippetDown(newSnippet2)

  // Assert
  const allSnippets = await snippetsProvider.getChildren();
  assert.strictEqual(allSnippets[0].id, 1);
  assert.strictEqual(allSnippets[1].id, 2);

  // Act
  snippetsProvider.moveSnippetUp(newSnippet1)

  // Assert
  const allSnippets1 = await snippetsProvider.getChildren();
  assert.strictEqual(allSnippets1[0].id, 1);
  assert.strictEqual(allSnippets1[1].id, 2);
 });
});
