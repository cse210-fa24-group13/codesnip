import * as assert from 'assert';
import { Memento } from 'vscode';
import { Snippet } from '../../interface/snippet';
import { SnippetService } from '../../service/snippetService';
import { DataAccess } from '../../data/dataAccess';

suite('SnippetService Tests', () => {
  // Mock the DataAccess and Memento objects for testing
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

  // Mock the Memento object for testing
  class MockMemento implements Memento {
    keys(): readonly string[] {
      throw new Error('Method not implemented.');
    }
    private storage: { [key: string]: any } = {};

    get<T>(key: string, defaultValue?: T): T | undefined {
      return this.storage[key] ?? defaultValue;
    }

    update(key: string, value: any): Thenable<void> {
      this.storage[key] = value;
      return Promise.resolve();
    }
  }

  let snippetService: SnippetService;

  setup(() => {
    // Create a new instance of SnippetService with mock DataAccess and Memento objects
    const mockDataAccess = new MockDataAccess();
    snippetService = new SnippetService(mockDataAccess);
  });

  test('AddSnippet adds a snippet correctly', () => {
    // Arrange
    const newSnippet: Snippet = {
      id: 2,
      label: 'New Snippet',
      children: [],
    };

    // Act
    snippetService.addSnippet(newSnippet);

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets.length, 1);
    assert.strictEqual(allSnippets[0].label, 'New Snippet');
  });

  test('RemoveSnippet removes a snippet correctly', () => {
    // Arrange
    const newSnippet: Snippet = {
      id: 2,
      label: 'New Snippet',
      children: [],
    };
    snippetService.addSnippet(newSnippet);

    // Act
    snippetService.removeSnippet(newSnippet);

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets.length, 0);
  });
  test('updateSnippet updates a snippet correctly', () => {
     // Arrange
    const newSnippetfile: Snippet = {
      id: 2,
      label: 'Old Snippet',
      value: 'Old Content',
      folder: false,
      children: []
    };
    
    const newSnippetfolder: Snippet = {
      id: 3,
      label: 'Folder',
      value: 'Folder Value',
      folder: true,
      children: []
    }
  
    const updatedSnippetfile: Snippet = {
      id: 2,
      label: 'Updated Snippet',
      value: 'Updated Content',
      folder: false,
      children: [],
    };
    
    const updatedSnippetfolder: Snippet = {
      id: 3,
      label: 'Updated Folder',
      value: 'New Value', // Should not overwrite folder value
      folder: true,
      children: [],
    };
    snippetService.addSnippet(newSnippetfile);
    snippetService.addSnippet(newSnippetfolder);

    // Act
    snippetService.updateSnippet(updatedSnippetfile);
    snippetService.updateSnippet(updatedSnippetfolder);
  
    // Assert
    const allSnippets = snippetService.getAllSnippetsAndFolders();
    assert.strictEqual(allSnippets[0].label, 'Updated Snippet');
    assert.deepStrictEqual(allSnippets[0].value, 'Updated Content');
    assert.strictEqual(allSnippets[1].label, 'Updated Folder');
    assert.deepStrictEqual(allSnippets[1].value, 'Folder Value'); // Value should remain unchanged for folders
  });

  test('updateSnippet should not update an unexisting snippet', () => {
    // Arrange
   const newSnippetfile: Snippet = {
     id: 2,
     label: 'Old Snippet',
     value: 'Old Content',
     folder: false,
     children: []
   };
 
   const updatedSnippetfile: Snippet = {
     id: 3,
     label: 'Updated Snippet',
     value: 'Updated Content',
     folder: false,
     children: [],
   };
   
   snippetService.addSnippet(newSnippetfile);

   // Act
   snippetService.updateSnippet(updatedSnippetfile);
 
   // Assert
   const allSnippets = snippetService.getAllSnippetsAndFolders();
   assert.strictEqual(allSnippets[0].label, 'Old Snippet');
   assert.deepStrictEqual(allSnippets[0].value, 'Old Content');
 });

  test('overrideSnippetId changes a snippet id correctly', () => {
    // Arrange
    const newSnippet1: Snippet = {
      id: 2,
      label: 'First Snippet',
      value: 'First Content',
      folder: false,
      children: []
    };

    const newSnippet2: Snippet = {
      id: 3,
      label: 'Second Snippet',
      value: 'Second Content',
      children: [],
      folder: false
    };
    snippetService.addSnippet(newSnippet1);
    snippetService.addSnippet(newSnippet2);

    // Act
    snippetService.overrideSnippetId(newSnippet2)

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets[1].id, snippetService.incrementLastId()-1);
  });

  test('moveSnippet moves down a snippet correctly', () => {
    // Arrange
    const newSnippet1: Snippet = {
      id: 2,
      label: 'First Snippet',
      value: 'First Content',
      folder: false,
      children: []
    };

    const newSnippet2: Snippet = {
      id: 3,
      label: 'Second Snippet',
      value: 'Second Content',
      children: [],
      folder: false
    };
    snippetService.addSnippet(newSnippet1);
    snippetService.addSnippet(newSnippet2);

    // Act
    snippetService.moveSnippet(newSnippet1,1)

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets[0].id, 3);
    assert.strictEqual(allSnippets[1].id, 2);
  });
  
  test('moveSnippet moves up a snippet correctly', () => {
    // Arrange
    const newSnippet1: Snippet = {
      id: 2,
      label: 'First Snippet',
      value: 'First Content',
      folder: false,
      children: []
    };

    const newSnippet2: Snippet = {
      id: 3,
      label: 'Second Snippet',
      value: 'Second Content',
      children: [],
      folder: false
    };
    snippetService.addSnippet(newSnippet1);
    snippetService.addSnippet(newSnippet2);

    // Act
    snippetService.moveSnippet(newSnippet2,-1)

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets[0].id, 3);
    assert.strictEqual(allSnippets[1].id, 2);
  });

  test('moveSnippet should not move a snippet when out of bound', () => {
    // Arrange
    const newSnippet1: Snippet = {
      id: 2,
      label: 'First Snippet',
      value: 'First Content',
      folder: false,
      children: []
    };

    const newSnippet2: Snippet = {
      id: 3,
      label: 'Second Snippet',
      value: 'Second Content',
      children: [],
      folder: false
    };
    snippetService.addSnippet(newSnippet1);
    snippetService.addSnippet(newSnippet2);

    // Act
    snippetService.moveSnippet(newSnippet1,5)

    // Assert
    const allSnippets = snippetService.getAllSnippets();
    assert.strictEqual(allSnippets[0].id, 2);
    assert.strictEqual(allSnippets[1].id, 3);
  });
});
