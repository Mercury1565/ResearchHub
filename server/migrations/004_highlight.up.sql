ALTER TABLE canvas_marks
  DROP CONSTRAINT canvas_marks_mark_type_check,
  ADD CONSTRAINT canvas_marks_mark_type_check
    CHECK (mark_type IN ('pen', 'arrow', 'text', 'highlight'));
