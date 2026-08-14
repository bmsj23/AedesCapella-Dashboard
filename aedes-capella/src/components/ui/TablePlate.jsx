import { useEffect, useRef, useState } from 'react';
import { C } from '../../constants/colors';
import Card from './Card';
import Mono from './Mono';

/*
 * Rows rendered per page.
 *
 * This is DOM windowing, not data paging. The rows are already in memory, so
 * it only bounds how many <tr> the browser lays out and keeps in the
 * accessibility tree. The datasets themselves are capped upstream by the fetch
 * limits in lib/supabaseApi.js and the client buffer in utils/liveDashboard.js,
 * so raising the real ceiling means a cursor query, not a bigger page size.
 */
const DEFAULT_PAGE_SIZE = 10;

function Columns({ columns }) {
  return (
    <colgroup>
      {columns.map((width, index) => <col key={index} style={{ width }} />)}
    </colgroup>
  );
}

/**
 * A data table on a technical plate: gridded figure zone with a title and
 * corner labels, a header that sits outside the scroll container so the
 * scrollbar starts beneath it, and a windowed body with a show-more footer.
 *
 * The header and body are two separate tables. That is what keeps the
 * scrollbar out of the header row, and it is also why both are
 * table-layout:fixed over the same colgroup: nothing else would hold their
 * columns in step.
 *
 * @param {string[]} headers      - column headings
 * @param {string[]} columns      - column widths, same length as headers
 * @param {Array}    rows         - full row set; only a window is rendered
 * @param {function} renderRow    - (row, index) => <tr>
 * @param {*}        resetScrollOn - value that returns the body to the top
 */
export default function TablePlate({
  title,
  note = null,
  label,
  fig,
  headers,
  columns,
  rows = [],
  renderRow,
  pageSize = DEFAULT_PAGE_SIZE,
  maxBodyHeight = '430px',
  resetScrollOn = null,
  style = {},
}) {
  const bodyRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [resetScrollOn]);

  /*
   * A reconcile every 30 s replaces the array identity, so the page size must
   * not reset with it or an operator reading further down is yanked back to
   * the first page. It is clamped instead, for when the set shrinks.
   */
  const shown = Math.min(visibleCount, rows.length);
  const visible = rows.slice(0, shown);
  const remaining = rows.length - shown;

  return (
    <Card
      padding={0}
      label={label}
      fig={fig}
      style={{ overflow: 'hidden', marginBottom: '24px', ...style }}
      figure={(
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <h3 style={{
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: C.text,
          }}>
            {title}
          </h3>
          {note && <Mono size="11px" color={C.gray}>{note}</Mono>}
        </div>
      )}
    >
      <div className="table-scroll">
        <div className="feed-head">
          <table className="data-table">
            <Columns columns={columns} />
            <thead>
              <tr>{headers.map(header => <th key={header}>{header}</th>)}</tr>
            </thead>
          </table>
        </div>
        <div ref={bodyRef} className="feed-body" style={{ maxHeight: maxBodyHeight }}>
          <table className="data-table">
            <Columns columns={columns} />
            <tbody>{visible.map(renderRow)}</tbody>
          </table>
        </div>
      </div>

      <div className="pd-metafoot feed-foot">
        <span>
          showing <b>{shown}</b> of <b>{rows.length}</b>
        </span>
        {remaining > 0 && (
          <button
            type="button"
            className="feed-more"
            onClick={() => setVisibleCount(count => count + pageSize)}
          >
            Show {Math.min(pageSize, remaining)} more
          </button>
        )}
      </div>
    </Card>
  );
}
