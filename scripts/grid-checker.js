/**
 *
 */

var H5PEditor = H5PEditor || {};

H5PEditor.widgets.gridChecker = H5PEditor.GridChecker = (function($) {
  // Took the solution from here: https://gist.github.com/jed/982883
  var generateUuid = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b);};

  function GridChecker(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;
  }

  GridChecker.prototype.generateGrid = function() {
    // TODO This should also reset any old values
    this.$container.find('table.h5p-grid-checker.grid').remove();

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
        'class': 'h5p-column-' + column.id,
        'text': column.text
      }).appendTo(table.find('thead > tr'));
    });
    $('<tbody>').appendTo(table);
    $.each(rows, function(rowIndex, row) {
      var tr = $('<tr>', {
        'class': 'h5p-row-' + row.id
      });
      $('<td>', {
        'text': row.text
      }).appendTo(tr);
      $.each(columns, function(columnIndex, column) {
        var td = $('<td>', {
          'class': 'h5p-column-' + column.id
        });
        var inputOptions = {
          'name': 'grid-row-' + row.id,
          'value': column.id
        };
        // TODO Make sure to set the grid values somehow
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

  GridChecker.prototype.gridTypeChanged = function(e) {
    if (this.canGenerateGrid()) {
      this.$generateGridButton.show();
      this.generateGrid();
      return;
    }

    this.$container.find('table.h5p-grid-checker.grid').remove();
    this.$generateGridButton.hide();
  };

  GridChecker.prototype.canGenerateGrid = function() {
    var type = this.$gridTypeField.val();

    return type === 'single' || type === 'multiple';
  };

  GridChecker.prototype.getRows = function() {
    var rows = [];

    this.parent.$form.find('.field.group.field-name-row').each(function() {
      var element = $(this);
      rows.push({
        'id': $(this).find('.field.field-name-rowId > input[type="text"]').val(),
        'text': $(this).find('.field.field-name-rowText > input[type="text"]').val()
      });
    });

    return rows;
  };

  GridChecker.prototype.getColumns = function() {
    var columns = [];

    this.parent.$form.find('.field.field-name-column').each(function() {
      var element = $(this);
      columns.push({
        'id': $(this).find('.field.field-name-columnId > input[type="text"]').val(),
        'text': $(this).find('.field.field-name-columnText > input[type="text"]').val()
      });
    });

    return columns;
  };

  GridChecker.prototype.assignUniqueIdentifiers = function() {
    this.parent.$form.find('.field.group.field-name-rowsAndColumns').find('.field.field-name-rowId > input, .field.field-name-columnId > input').filter(function() {
      return !this.value;
    }).each(function() {
      $(this).val(generateUuid()).trigger('change');
    });
  };

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

  GridChecker.prototype.save = function() {
    var table = this.$container.find('table.h5p-grid-checker.grid').get(0);

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

    self.$gridTypeField = self.parent.$form.find('.field.field-name-' + self.field.gridChecker.typeField + '.select > select');

    self.$generateGridButton = $('<div>', {
      'class': 'h5peditor-button h5peditor-button-textual',
      'role': 'button',
      'tabindex': '0',
      'aria-disabled': 'false',
      'text': 'Click to generate grid and mark correct options' // TODO This needs to be translated
    }).on('click', function() {
      self.generateGrid();
      $(this).removeClass('changed');
    }).appendTo(self.$container);

    if (!self.canGenerateGrid()) {
      self.$generateGridButton.hide();
    }
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
    self.parent.$form.find('.field.group.field-name-rowsAndColumns .h5peditor-button.h5peditor-button-textual').on('click', function() {
      self.assignUniqueIdentifiers();
      self.parent.$form.find('.field.group.field-name-rowsAndColumns .h5peditor-button').off('click', baseDataChangedHandler);
      self.parent.$form.find('.field.group.field-name-rowsAndColumns .h5peditor-button').on('click', baseDataChangedHandler);
      self.parent.$form.find('.field.group.field-name-row .field.field-name-rowText > input[type="text"], .field.group.field-name-column .field.field-name-columnText > input[type="text"]').off('change', baseDataChangedHandler);
      self.parent.$form.find('.field.group.field-name-row .field.field-name-rowText > input[type="text"], .field.group.field-name-column .field.field-name-columnText > input[type="text"]').on('change', baseDataChangedHandler);
    });

    self.parent.$form.find('.field.group.field-name-rowsAndColumns .h5peditor-button').on('click', baseDataChangedHandler);
    self.parent.$form.find('.field.group.field-name-row .field.field-name-rowText > input[type="text"], .field.group.field-name-column .field.field-name-columnText > input[type="text"]').on('change', baseDataChangedHandler);

    if (self.params && self.canGenerateGrid) {
      self.generateGrid();
    }
  };

  GridChecker.prototype.validate = function() {
    if (this.save()) {
      return true;
    }

    this.setValue(this.field, undefined);
    return true;
  };

  GridChecker.prototype.remove = function() {
    $wrapper.remove();
  };

  return GridChecker;
})(H5P.jQuery);
