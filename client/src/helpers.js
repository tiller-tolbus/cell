import { ROW_COUNT, CELL_CAP } from "./constants";
import availableFormulas from "./components/grid/formulajs";
import cloneDeep from "lodash/cloneDeep";

const arrayInsertItemAtIndex = (index, item, array) => {
  array.splice(index, 0, item);
};
/* GRID HELPERS */
const charRange = (start, stop) => {
  var result = [];

  // get all chars from starting char
  // to ending char
  var i = start.charCodeAt(0),
    last = stop.charCodeAt(0) + 1;
  for (i; i < last; i++) {
    result.push(String.fromCharCode(i));
  }

  return result;
};
const toString26 = (num) => {
  var alpha = charRange("a", "z");
  var result = "";

  // no letters for 0 or less
  if (num < 1) {
    return result;
  }

  var quotient = num,
    remainder;

  // until we have a 0 quotient
  while (quotient !== 0) {
    // compensate for 0 based array
    var decremented = quotient - 1;

    // divide by 26
    quotient = Math.floor(decremented / 26);

    // get remainder
    remainder = decremented % 26;

    // prepend the letter at index of remainder
    result = alpha[remainder] + result;
  }

  return result;
};

const getFirstRow = (length = 27) => {
  /*
  this is our first row
  */
  const columns = getColumns(length);
  return {
    rowId: "header",
    cells: columns.map((col) => {
      return { type: "header", text: col.columnName };
    }),
  };
};
const getFirstCell = (text) => {
  /* returns what the first cell of each row should contain and what mete data it should have */
  return { type: "extendedText", text, nonEditable: true };
};
const getRows = (columnCount = 27, rowCount = ROW_COUNT) => {
  /*
  main grid data is returned here
  */
  return generateRows(rowCount, [getFirstRow(columnCount)]);
};

const getColumns = (length = 27) => {
  /**
   * given a length generate the columns react-grid needs and we need to display stuff
   * note this is different from first row in our rows
   *
   * decides metadata like width and height of columns
   * retuns columns
   **/
  let columns = [];
  //we have to account for our meta column
  let newLength = length + 1;
  for (let i = 0; i < newLength; i++) {
    //make first COLUMN smaller
    let width = 100;
    if (i === 0) {
      width = 60;
    }

    columns.push({
      columnId: i,
      columnName: toString26(i).toUpperCase(),
      width: width,
      resizable: true,
    });
  }
  return columns;
};
const fetchCellValue = (cellName, rows) => {
  /*
   * Given a celll name
   * (pattern =>  alphabet char followed by a numeric string) (for now)
   * assumes grid is in Alphanumerical order (x and y)
   * it will output the current content of that cell along with it's coordinates in rows (columnId, rowId)
   * todo: should also eventually do arrays
   * and eventually cells should have identifiers for ease of use...
   *
   */

  //no cellName nothing to do
  if (!cellName) return false;

  //split string into alphabet / numeral
  let splitName = cellName.match(/[a-zA-Z]+|[0-9]+/g);

  let columnName = splitName[0];
  let row = splitName[1];
  //either value doesn't exist, return false
  if (!columnName || !row) return false;

  let column;
  //find column in the header list, and the index will be the position in row
  rows[0].cells.forEach((cell, index) => {
    if (cell.text === columnName) {
      //found our column here, save the index
      column = index;
    }
  });
  //nothing found return false
  if (!column) return false;
  //if we have both row and column value, try to access the cell, and return it's content
  let cellValue = rows[row].cells[column];
  //for some reason, no cellValue can be found, return false
  if (!cellValue) return;
  //found the value we need, construct an object we can use elsewhere
  return { value: cellValue.text, columnId: column, rowId: row };
};
const fetchFormulaData = (cellValue, rows) => {
  if (!cellValue) return false;
  //if our cellValue starts with "=" than we have a formula on our hands
  if (cellValue[0] !== "=") {
    return false;
  }
  //try to get at the formula
  const foundFormula = cellValue.slice(
    cellValue.indexOf("=") + 1,
    cellValue.indexOf("(")
  );
  //no formula bye bye
  if (!foundFormula) return false;

  //todo: add feedback in above case
  const currentFormula = availableFormulas.filter(
    (formula) => formula.name === foundFormula
  );
  //formula function not found in our availableFormulas list, nothing to evaluate, return false
  if (currentFormula && currentFormula.length === 0) return false;
  //get all our params here
  //our params are in between "(" ")", seprated by ","
  const betweenBrackets = cellValue.slice(
    cellValue.indexOf("(") + 1,
    cellValue.indexOf(")")
  );
  const paramList = betweenBrackets.split(",");
  //convert paramsInto values we can pass to our Formula
  //todo: remove space around characeters? help user out
  const valueList = paramList.map((item) => fetchCellValue(item, rows));
  let allValuesExist = true;
  valueList.forEach((item) => {
    if (item === false) {
      allValuesExist = false;
    }
  });
  //some of the cells did not evulate, can't proceed, return false
  //todo: feedback
  if (!allValuesExist) return false;
  //before we can actually excute we need to transform the list into [1,2,3,4,5]
  const executableList = valueList.map((item) => item.value);
  //add onChange
  const formulaData = {
    ...currentFormula[0],
    valueList,
    nonEvaledText: cellValue,
  };
  return formulaData;
};
const formulateFormula = (cellValue, columnId, rowId, rows) => {
  /**
   * todo: comment better
   */
  const formulaData = fetchFormulaData(cellValue, rows);

  if (formulaData === false) return false;
  //update formula cell withe formula data using row and column id
  let newRows = cloneDeep(rows);
  //update formula cell with the needed values
  newRows[rowId].cells[columnId] = {
    ...newRows[rowId].cells[columnId],
    formulaData,
    //update the formula cell value too using our value list and execute foo
    text: formulaData
      .execute(formulaData.valueList.map((item) => item.value))
      .toString(),
  };
  //update each param cell to have formulaLocation and update function too trigger on change
  formulaData.valueList.forEach((item) => {
    //add current formula to the list of deps in this param cell
    let cellRowId = item.rowId;
    let cellColumnId = item.columnId;
    const currentCell = { ...newRows[cellRowId].cells[cellColumnId] };
    //this cell already has a formula, concat the new one on top of these
    if (
      currentCell.dependantFormulas &&
      currentCell.dependantFormulas.length > 0
    ) {
      newRows[cellRowId].cells[cellColumnId] = {
        ...currentCell,
        //CONSIDERATION: do we always concat?
        //CONSIDERATION: is there possible duplication here?
        dependantFormulas: [
          ...currentCell.dependantFormulas,
          { columnId, rowId },
        ],
      };
    }
    //this is the first formula here
    else {
      newRows[cellRowId].cells[cellColumnId] = {
        ...currentCell,
        //CONSIDERATION: do we always concat?
        //CONSIDERATION: is there possible duplication here?
        dependantFormulas: [{ columnId, rowId }],
      };
    }
  });
  //return the new udpate rows
  return newRows;
};
const unHookFormula = (formulaData, columnId, rowId, rows) => {
  /**
   * unlike param cells
   * i.e deleting the ref to the formula cell in dependantFormulas array in param cells
   * and remove formulaData from given formula cell
   **/
  if (formulaData === false) return false;
  //update formula cell removing the formulaData obj
  let newRows = cloneDeep(rows);
  //update formula cell, deleting formulaData
  let formulaCell = newRows[rowId].cells[columnId];
  delete formulaCell.formulaData;
  //update each param cell, removing the link between it and the formula cell
  formulaData.valueList.forEach((item) => {
    let cellRowId = item.rowId;
    let cellColumnId = item.columnId;
    const currentCell = { ...newRows[cellRowId].cells[cellColumnId] };
    if (
      currentCell.dependantFormulas &&
      currentCell.dependantFormulas.length > 0
    ) {
      //make a new dependantFormulas array, removing the current formula
      let newDependantFormulas = currentCell.dependantFormulas.filter(
        (item) => {
          return item.columnId !== columnId || rowId !== item.rowId;
        }
      );
      //if newDependantFormulas are empty ie length == 0, remove them entirely
      newRows[cellRowId].cells[cellColumnId] = {
        ...currentCell,
        dependantFormulas: newDependantFormulas,
      };
      if (newDependantFormulas.length === 0) {
        delete newRows[cellRowId].cells[cellColumnId].dependantFormulas;
      }
    }
  });
  //return the new udpate rows
  return newRows;
};
const updateCell = (changes, prevRows) => {
  //use the changes object to directly access the correct cell and update it using the new text!
  const { rowId, columnId, newCell } = changes[0];
  let newRows = cloneDeep(prevRows);
  newRows[rowId].cells[columnId].text = newCell.text;

  const { dependantFormulas } = newRows[rowId].cells[columnId];
  //this cell has one or more depandant formulas,
  //we run updateFormulaFoo
  if (dependantFormulas && dependantFormulas.length > 0) {
    dependantFormulas.forEach((item) => {
      const formulaLocation = item;
      newRows = updateFormulaFoo(
        newCell.text,
        formulaLocation,
        { columnId, rowId },
        newRows
      );
    });
  }
  //check if user entered a formula
  //CONSIDERATION: does the below and above conflict (rows updates)????
  let potentiallyNewerRows = formulateFormula(
    newCell.text,
    columnId,
    rowId,
    newRows
  );
  if (potentiallyNewerRows) newRows = potentiallyNewerRows;
  return newRows;
};
const updateFormulaFoo = (
  updatedValue,
  formulaLocation,
  currentCellLocation,
  rows
) => {
  /**
   * this runs on cell change
   * this goes to formula cell and updates it depending on the updatedValue
   * todo:clean it up
   * todo: validate input (display error state in formula cell if no logic value can be derived here)
   */
  let newRows = cloneDeep(rows);
  const formulaColId = formulaLocation.columnId;
  const formulaRowId = formulaLocation.rowId;
  const { columnId, rowId } = currentCellLocation;

  let newFormulaCell = { ...newRows[formulaRowId].cells[formulaColId] };
  let newFormulaData = {
    ...newRows[formulaRowId].cells[formulaColId].formulaData,
  };
  //update valueList with the current cellValue
  //TODO: optmise if no changes cancel the rest of this
  //TODO: sometimes, for some reason, no newFormulaData, just return the unchanged rows
  if (!newFormulaData) return newRows;
  let newValueList = newFormulaData.valueList.map((item) => {
    //todo: make all the values (ids) numbers not stringed numbers
    if (columnId == item.columnId && rowId == item.rowId) {
      //found the value to update
      return { ...item, value: updatedValue };
    }
    return item;
  });
  newFormulaData.valueList = newValueList;
  //we have change in our param cells, that means update formula cell
  const executableList = newFormulaData.valueList.map((item) => item.value);

  //update the value
  newFormulaCell.formulaData = newFormulaData;
  newFormulaCell.text = newFormulaData.execute(executableList).toString();
  //update the formula cell with our values
  newRows[formulaRowId].cells[formulaColId] = newFormulaCell;

  return newRows;
};
const generateRows = (rowCount, oldRows) => {
  //++cellcount
  /* 
    generate X more rows 
    returns all new grid rows 
  */
  //make a copy of the old rows
  const newRows = cloneDeep(oldRows);
  //establish the number of columns
  const colCount = newRows[0].cells.length;
  //add x rows (rowCount)
  for (let i = 0; i < rowCount; i++) {
    let cells = [];
    //make the cells using colCount
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      //if it's a first cell, insert the row count and add nonEditable => true to make it not editable
      // else just have an empty string and nonEditable => false (by default)
      let extraParams = {};
      if (colIndex === 0) {
        extraParams = getFirstCell(newRows.length.toString());
      }

      cells.push({ type: "extendedText", text: "", ...extraParams });
    }
    //insert the id of the new row and insert the row
    newRows.push({
      rowId: newRows.length,
      cells,
    });
  }
  return newRows;
};
const verifyCellCount = (columns, rows, offset) => {
  //returns true/false appropriately
  //we're interested in the cells that end up being saved to the backend here
  //deduct none useable columns and rows (from offset too)

  const futureCount = (rows.length - 1) * (columns.length - 1) + (offset - 1);
  if (futureCount > CELL_CAP) {
    //return false
    return false;
  }
  return true;
};
const inCell = (cellArray, rows) => {
  /***
   * given cells array
   * example: [[1,1],{"meta":{ "bold":true },"data":{"input":"ID","output":"ID"}}]
   * put them in their place!
   * and return an updated rows array
   */
  let newRows = cloneDeep(rows);
  cellArray.forEach((item) => {
    let rowId = item[0][0];
    let columnId = item[0][1];
    let cellData = item[1];
    const cellToUpdate = newRows[rowId].cells[columnId];
    cellToUpdate.text = cellData.data.input;

    //make our customStyles obj from this data
    let customStyles = {
      bold: cellData.meta.bold,
      italic: cellData.meta.italics,
      color: cellData.meta.foreground,
      backgroundColor: cellData.meta.background,
      strikeThrough: cellData.meta.strikethrough,
      fontSize: cellData.meta.size,
    };
    //remove all the fields that evaled to undefined (don't exist)
    Object.keys(customStyles).forEach(
      (key) => customStyles[key] === undefined && delete customStyles[key]
    );
    //update the customStyles obj only if we end up with any defined properties
    if (Object.keys(customStyles).length > 0) {
      cellToUpdate.customStyles = customStyles;
    }
  });
  return newRows;
};
const reiszeColumns = (columns, ci, width) => {
  /* 
    Updates columns after resize action
    returns array of new columns 
  */
  const prevColumns = [...columns];
  const columnIndex = prevColumns.findIndex((el) => el.columnId === ci);
  const resizedColumn = prevColumns[columnIndex];
  const updatedColumn = { ...resizedColumn, width };
  prevColumns[columnIndex] = updatedColumn;
  return [...prevColumns];
};
const addColumn = (selectedColumnId, direction, columns, rows) => {
  //++cellcount
  /**
   * given a columnId and direction
   * insert a whole column
   * i.e add a cell in each row at the given columnId(cells[x])
   * offset either to the left or right
   * updates state (rows and columns)
   **/

  //make a copy of current rows and columns
  let newRows = cloneDeep(rows);
  let newColumns = cloneDeep(columns);
  //cell index is offset by direction from columnId
  let cellIndex =
    direction === "left" ? selectedColumnId : selectedColumnId + 1;

  //update our columns here
  //split into two arrays, before and after cellIndex
  //todo: interact with a copy of columns.... not columns itself
  let newColumnsBefore = newColumns.slice(0, cellIndex);
  let newColumnsAfter = newColumns.slice(cellIndex);
  //add our new column in the before array
  newColumnsBefore.push({
    //todo: make a function that spits out this data in our helper
    columnId: newColumnsBefore.length,
    //todo: use base26string on this and on the rest of the columnNames
    columnName: toString26(newColumnsBefore.length).toUpperCase(),
    width: 100,
    resizable: true,
  });
  //adjust the after array's indecies
  let startIndex = newColumnsBefore.length;
  newColumnsAfter = newColumnsAfter.map((item, index) => {
    return {
      ...item,
      columnId: startIndex + index,
      columnName: toString26(startIndex + index).toUpperCase(),
    };
  });
  //merge the two parts
  const finalColumns = [...newColumnsBefore, ...newColumnsAfter];
  //update our rows here
  newRows.forEach((item, index) => {
    let newCell;
    if (index === 0) {
      //header cells
      //use the generated columns above here
      //update the title of the first row (columns)
      let newCells = finalColumns.map((item) => {
        console.log("item", item);
        return { type: "header", text: item.columnName };
      });
      newRows[0].cells = newCells;
    } else {
      //regular cells
      //add a new empty cell in this row at the index we have
      newCell = { type: "extendedText", text: "" };
      //insert newCells at the current index
      arrayInsertItemAtIndex(cellIndex, newCell, item.cells);
    }
  });
  return { newColumns: finalColumns, newRows: newRows };
};
const addRow = (selectedRowId, direction, rows) => {
  //++cellcount
  /**
   * given a row id and direction
   * insert a whole row
   * offset either to be above or below currently selected row
   * updates state (rows )
   **/
  //make a copy of current rows
  let newRows = cloneDeep(rows);
  //cell index is offset by direction from columnId
  let rowIndex = direction === "above" ? selectedRowId : selectedRowId + 1;
  //split into tow arrays, before rowIndex and afterRowIndex
  //split into two arrays, before and after cellIndex
  let newRowsBefore = newRows.slice(0, rowIndex);
  let newRowsAfter = newRows.slice(rowIndex);

  //add our new row in the before array

  newRowsBefore.push({
    rowId: newRowsBefore.length,
    //only really using this for the length value
    cells: newRowsBefore[0].cells.map((item, index) => {
      if (index === 0) {
        return {
          type: "extendedText",
          text: newRowsBefore.length.toString(),
          nonEditable: true,
        };
      }
      return { type: "extendedText", text: "" };
    }),
  });
  let startIndex = newRowsBefore.length;

  //increment the row ids and the first cell  text(count cell ) of each of these rows
  newRowsAfter = newRowsAfter.map((item, index) => {
    let newCells = [...item.cells];
    newCells[0].text = (startIndex + index).toString();
    return {
      rowId: startIndex + index,
      cells: newCells,
    };
  });
  //merge the two arrays
  let finalRows = [...newRowsBefore, ...newRowsAfter];
  return { newRows: finalRows };
};
const deleteColumn = (selectedColumnId, columns, rows) => {
  /**
   * Given columnId, delete a whole column
   * i.e delete from each row the cell at selectedColumnId (cells[x])
   * updates row and column state
   * todo: in the future should just return new rows/columns
   *  */
  //make a copy of current rows and columns
  let newRows = cloneDeep(rows);
  let newColumns = cloneDeep(columns);

  //update our columns here
  //split into two arrays, before and after cellIndex
  let newColumnsBefore = newColumns.slice(0, selectedColumnId);
  let newColumnsAfter = newColumns.slice(selectedColumnId);
  //the column to remove is here in the front of the after array, shift it
  console.log(newColumnsAfter.shift());
  //adjust the after array's indecies and names
  let startIndex = selectedColumnId;
  newColumnsAfter = newColumnsAfter.map((item, index) => {
    return {
      ...item,
      columnId: startIndex + index,
      columnName: toString26(startIndex + index).toUpperCase(),
    };
  });
  //merge the two parts
  const finalColumns = [...newColumnsBefore, ...newColumnsAfter];
  //update our rows, deleteing the cells that need to be
  const finalRows = newRows.map((item, index) => {
    if (index === 0) {
      //header cells
      //use the generated columns above here
      //update the title of the first row (columns)
      let newCells = finalColumns.map((item) => {
        return { type: "header", text: item.columnName };
      });
      return { ...item, cells: newCells };
    } else {
      //regular cells
      let newCells = cloneDeep(item.cells);
      //remove the cell we want to get rid of
      newCells.splice(selectedColumnId, 1);
      return { ...item, cells: newCells };
    }
  });
  return { newColumns: finalColumns, newRows: finalRows };
};
const deleteRow = (selectedRowId, rows) => {
  /**
   * Given rowId, delete a whole row
   * i.e delete a whole entry from rows array, offseting the count
   * updates rows state
   * todo: in the future should just return new rows
   *  */

  //split into tow arrays, before rowIndex and afterRowIndex
  //split into two arrays, before and after cellIndex
  let newRows = cloneDeep(rows);
  let newRowsBefore = newRows.slice(0, selectedRowId);
  let newRowsAfter = newRows.slice(selectedRowId);

  //the row we want to delete is in the after array (at 0 index), we shift it off
  newRowsAfter.shift();

  let startIndex = selectedRowId;

  //increment the row ids and the first cell  text(count cell ) of each of these rows
  newRowsAfter = newRowsAfter.map((item, index) => {
    let newCells = [...item.cells];
    newCells[0].text = (startIndex + index).toString();
    return {
      rowId: startIndex + index,
      cells: newCells,
    };
  });
  //merge the two arrays
  let finalRows = [...newRowsBefore, ...newRowsAfter];
  return { newRows: finalRows };
};
/* JSON HELPERS */
const jsonToData = (json) => {
  /*
    take parsed json from the server and turn it into something client can use
    returns rows
 */
  //todo: add a check?
  //if (!json || json.length === 0)return false;
  let columnLength = json[0].length + 1; // +1 because the first column is the row count one
  //our first row (columns)
  const firstRow = [getFirstRow(columnLength)];

  const rows = json.map((row, index) => {
    //since we're inserting a first row after this, we offset our index by 1
    let offsetIndex = index + 1;
    const cells = [];
    //include our first meta data cell at the start of each row (cells[0])
    cells.push(getFirstCell(offsetIndex.toString()));
    //add the rest of the data from the json
    row.map((item) => {
      cells.push({ type: "extendedText", text: item });
    });
    return {
      rowId: offsetIndex,
      cells,
    };
  });
  //combine first row(meta data) with the rest of the rows (data from backend)
  return [...firstRow, ...rows];
};
const dataToJson = (data) => {
  /*
    takes grid data(rows) and transform it into what the back-end expects
    excluding first cell of each row and the first entierly(meta data)
    returns back end ready data
  */
  //exclude first row (a,b,c...) (coulmns)
  let newData = [...data];
  newData.shift();

  const specData = newData.map((item) => {
    let newCells = [...item.cells];
    //exclude the first cell (1,2,3...) (row count cell)
    newCells.shift();
    return newCells.map((item) => {
      //handle formula cell values (don't send formula results, send formula)
      if (item.formulaData && item.formulaData.nonEvaledText) {
        return item.formulaData.nonEvaledText;
      }
      return item.text;
    });
  });

  return specData;
};

/*ENV HELPERS*/
const isDev = () =>
  !process.env.NODE_ENV || process.env.NODE_ENV === "development";
/* TIME HELPERS */
//TODO: should be it's own file
const formatDate = (dateNumber) => {
  if (!dateNumber) return "no date given";
  //converts a given date object into something we can show the user
  var options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const dateObj = new Date(dateNumber);
  return dateObj.toLocaleDateString("en-US", options);
};
/* CSV HELPERS */
const exportRowsCSV = (rows) => {
  //TODO: we probably want formula result and not formula itself here
  const parsedRows = dataToJson(rows);

  const csv = parsedRows
    .map(
      (row) =>
        row
          .map(String) // convert every value to String
          .map((v) => v.replaceAll('"', '""')) // escape double colons
          .map((v) => `"${v}"`) // quote it
          .join(",") // comma-separated
    )
    .join("\r\n"); // rows starting on new lines
  downloadBlob(csv, "export.csv", "text/csv;charset=utf-8;");
  return true;
};
function downloadBlob(content, filename, contentType) {
  // Create a blob
  var blob = new Blob([content], { type: contentType });
  var url = URL.createObjectURL(blob);

  // Create a link to download it
  var pom = document.createElement("a");
  pom.href = url;
  pom.setAttribute("download", filename);
  pom.click();
}
const importCSV = (csv) => {
  function extractAllText(str) {
    //get everything between double quots 
    const re = /"(.*?)"/g;
    const result = [];
    let current;
    while ((current = re.exec(str))) {
      result.push(current.pop());
    }
    return result.length > 0 ? result : [str];
  }
  const data = csv.split("\n").map((v) => {
    //add a comma to the start and end
    //get everything between ," and ", even if empty string
    const something = "," + v + ",";
    const matches = extractAllText(something);
    console.log("matches", matches);
    return matches;
  });

  console.log("data", data);
  return data;
};
export {
  getColumns,
  getRows,
  updateCell,
  generateRows,
  dataToJson,
  jsonToData,
  reiszeColumns,
  isDev,
  toString26,
  formulateFormula,
  unHookFormula,
  inCell,
  formatDate,
  addColumn,
  addRow,
  deleteColumn,
  deleteRow,
  verifyCellCount,
  exportRowsCSV,
  importCSV,
};
