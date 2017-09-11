/**
 * GridChecker editor library
 */

var H5PEditor = H5PEditor || {};

H5PEditor.widgets.gridChecker = H5PEditor.GridChecker = (function($) {
  // Unique identifier code was taked from here: https://gist.github.com/jed/982883
  var generateUuid = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b);};

  var ROWS_AND_COLUMNS_SELECTOR = '.field.group.field-name-rowsAndColumns';
  var GRID_TABLE_SELECTOR = 'table.h5p-grid-checker.grid';
  var ROW_SELECTOR = '.field.group.field-name-row';
  var ROW_ID_SELECTOR = '.field.field-name-rowId > input[type="text"]';
  var ROW_TEXT_SELECTOR = '.field.field-name-rowText > input[type="text"]';
  var COLUMN_SELECTOR = '.field.field-name-column';
  var COLUMN_ID_SELECTOR = '.field.field-name-columnId > input[type="text"]';
  var COLUMN_TEXT_SELECTOR = '.field.field-name-columnText > input[type="text"]';

  /**
   * Constructor function
   * @param       {object} parent     Parent representation
   * @param       {object} field      Field structure representation
   * @param       {mixed} params      Array of stored data or undefined
   * @param       {function} setValue Value storage callback
   * @constructor
   */
  function GridChecker(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;
  }

  /**
   * Generates/regenerates grid table and appends it to container.
   * Any already present tables are removed.
   * @return {void}
   */
  GridChecker.prototype.generateGrid = function() {
    this.$container.find(GRID_TABLE_SELECTOR).remove();
    // This is the last line of defence that should make sure that identifiers
    // are set before table is generated
    this.assignUniqueIdentifiers();

    var self = this;
    var lookup = self.getLookup();
    var gridType = self.$gridTypeField.val();
    var rows = self.getRows();
    var columns = self.getColumns();
    var table = $('<table>', {
      'class': 'h5p-grid-checker grid'
    });
    $('<thead>').appendTo(table);
    $('<tr>').appendTo(table.find('thead'));
    $('<th>').appendTo(table.find('thead > tr'));
    $.each(columns, function(index, column) {
      $('<th>', {
        'class': 'grid-column-' + column.id,
        'text': column.text
      }).appendTo(table.find('thead > tr'));
    });
    $('<tbody>').appendTo(table);
    $.each(rows, function(rowIndex, row) {
      var tr = $('<tr>', {
        'class': 'grid-row-' + row.id
      });
      $('<td>', {
        'text': row.text
      }).appendTo(tr);
      $.each(columns, function(columnIndex, column) {
        var td = $('<td>', {
          'class': 'grid-column-' + column.id
        });
        var inputOptions = {
          'name': 'grid-row-' + row.id,
          'value': column.id
        };
        if (gridType === 'single') {
          inputOptions.type = 'radio';
        } else if (gridType === 'multiple') {
          inputOptions.type = 'checkbox';
        }
        if ( lookup && lookup.hasOwnProperty(row.id) && lookup[row.id].indexOf(column.id) !== -1) {
          inputOptions.checked = true;
        }
        $('<input>', inputOptions).appendTo(td);
        td.appendTo(tr);
      });
      tr.appendTo(table.find('tbody'));
    });

    table.find('input[type="checkbox"],input[type="radio"]').on('change', function() {
      self.save();
    });

    table.appendTo(this.$responsiveTableContainer);
  };

  /**
   * Callback for case of grid type being changed
   * Calls table generation and hides/shows corresponding button
   * @return {void}
   */
  GridChecker.prototype.gridTypeChanged = function() {
    if (this.canGenerateGrid()) {
      this.$generateGridButton.show();
      this.generateGrid();
      return;
    }

    this.$container.find(GRID_TABLE_SELECTOR).remove();
    this.$generateGridButton.hide();
  };

  /**
   * Determines if grid could be generated
   * @return {boolean} Only returns false for textual type
   */
  GridChecker.prototype.canGenerateGrid = function() {
    var type = this.$gridTypeField.val();

    return type === 'single' || type === 'multiple';
  };

  /**
   * Returns rows data from current DOM representation
   * @return {array} Array of objects with id and text
   */
  GridChecker.prototype.getRows = function() {
    var rows = [];

    this.parent.$form.find(ROW_SELECTOR).each(function() {
      var element = $(this);
      rows.push({
        'id': $(this).find(ROW_ID_SELECTOR).val(),
        'text': $(this).find(ROW_TEXT_SELECTOR).val()
      });
    });

    return rows;
  };

  /**
   * Returns columns data from current DOM representation
   * @return {array} Array ob objects with id and text
   */
  GridChecker.prototype.getColumns = function() {
    var columns = [];

    this.parent.$form.find(COLUMN_SELECTOR).each(function() {
      var element = $(this);
      columns.push({
        'id': $(this).find(COLUMN_ID_SELECTOR).val(),
        'text': $(this).find(COLUMN_TEXT_SELECTOR).val()
      });
    });

    return columns;
  };

  /**
   * Set unique identifiers to any rows or columns that are still missing those
   * Uses UUID V4 like identifiers
   * @return {void}
   */
  GridChecker.prototype.assignUniqueIdentifiers = function() {
    this.parent.$form.find(ROWS_AND_COLUMNS_SELECTOR).find(ROW_ID_SELECTOR + ', ' + COLUMN_ID_SELECTOR).filter(function() {
      return !this.value;
    }).each(function() {
      $(this).val(generateUuid()).trigger('change');
    });
  };

  /**
   * Returns a lookup table based on either current values or previously stored ones
   * @return {object} Keyed by row identifiers with arrays of columnsidentifiers
   */
  GridChecker.prototype.getLookup = function() {
    var params = this.storedParams ? this.storedParams : this.params;
    var lookup = {};
    if (params && params.length > 0) {
      $.each(params, function(index, element) {
        lookup[element.gridRowId] = element.gridRowColumns;
      });
    }
    return lookup;
  };

  /**
   * Determines current checked grid values and stores those
   * A local temporary copy is also kept for quick reference
   * @return {boolean}
   */
  GridChecker.prototype.save = function() {
    var table = this.$container.find(GRID_TABLE_SELECTOR).get(0);

    if (table) {
      var rows = this.getRows();
      var data = [];
      $.each(rows, function(index, row) {
        var dataRow = {
          gridRowId: row.id,
          gridRowColumns: []
        };
        $('input[name="grid-row-' + row.id + '"]:checked').each(function() {
          dataRow.gridRowColumns.push($(this).val());
        });
        data.push(dataRow);
      });

      this.setValue(this.field, data);
      this.storedParams = data;
      return true;
    }

    return false;
  };

  /**
   * Builds the DOM objects and appends to the $wrapper
   * Also deals with setup of listeners and event handlers
   * @param  {object} $wrapper DOM node of contsainer element
   * @return {void}
   */
  GridChecker.prototype.appendTo = function($wrapper) {
    var self = this;
    var baseDataChangedHandler = function() {
      if (self.canGenerateGrid()) {
        self.$generateGridButton.addClass('changed');
      }
    };

    self.$container = $('<div>', {
      'class': 'field field-name-' + self.field.name + ' h5p-grid-checker group'
    });

    // XXX This should probably ge selected with H5P own methods
    self.$gridTypeField = self.parent.$form.find('.field.field-name-' + self.field.gridChecker.typeField + '.select > select');

    self.$generateGridButton = $('<div>', {
      'class': 'h5peditor-button h5peditor-button-textual',
      'role': 'button',
      'tabindex': '0',
      'aria-disabled': 'false',
      'text': H5PEditor.t('H5PEditor.GridChecker', 'generateGrid', {})
    }).on('click', function() {
      self.generateGrid();
      $(this).removeClass('changed');
    }).appendTo(self.$container);

    if (!self.canGenerateGrid()) {
      self.$generateGridButton.hide();
    }
    // XXX This could be done with H5P own methods
    self.$gridTypeField.on('change', function() {
      self.gridTypeChanged();
    });

    self.$responsiveTableContainer = $('<div>', {
      'class': 'h5p-gridchecker-editor-responsive'
    }).appendTo(self.$container);

    self.$container.appendTo($wrapper);

    // Generate identifiers for fields with empty value
    self.assignUniqueIdentifiers();
    // Setup listeners to regerate identifiers as fields get added
    self.parent.$form.find(ROWS_AND_COLUMNS_SELECTOR + ' .h5peditor-button.h5peditor-button-textual').on('click', function() {
      self.assignUniqueIdentifiers();
      self.parent.$form.find(ROWS_AND_COLUMNS_SELECTOR + ' .h5peditor-button')
        .off('click', baseDataChangedHandler)
        .on('click', baseDataChangedHandler);
      self.parent.$form.find(ROW_SELECTOR + ' ' + ROW_TEXT_SELECTOR + ', ' + COLUMN_SELECTOR + ' ' + COLUMN_TEXT_SELECTOR)
        .off('change', baseDataChangedHandler)
        .on('change', baseDataChangedHandler);
    });

    self.parent.$form.find(ROWS_AND_COLUMNS_SELECTOR + ' .h5peditor-button')
      .on('click', baseDataChangedHandler);
    self.parent.$form.find(ROW_SELECTOR + ' ' + ROW_TEXT_SELECTOR + ', ' + COLUMN_SELECTOR + ' ' + COLUMN_TEXT_SELECTOR)
      .on('change', baseDataChangedHandler);

    if (self.params && self.canGenerateGrid) {
      self.generateGrid();
    }
  };

  /**
   * Runs before page is saved, makes sure the values are stored.
   * Sets value to undefined, if data table is missing.
   * Does not really do any validation.
   * @return {boolean} Always returns true
   */
  GridChecker.prototype.validate = function() {
    if (this.save()) {
      return true;
    }

    this.setValue(this.field, undefined);
    return true;
  };

  /**
   * Handles element removal
   * @return {void}
   */
  GridChecker.prototype.remove = function() {
    $wrapper.remove();
  };

  // Additional library specific translation stings
  H5PEditor.language['H5PEditor.GridChecker'] = {
    'libraryStrings': {
      'generateGrid': 'Click to generate grid and mark correct options'
    }
  };

  return GridChecker;
})(H5P.jQuery);
