import { Table, THead, TBody, TR, TH, TD } from "url-shortener";

export const LinkStats = () => (
  <div
    style={{
      maxWidth: 460,
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      overflow: "hidden",
    }}
  >
    <Table>
      <THead>
        <TR>
          <TH>단축 링크</TH>
          <TH>클릭</TH>
          <TH>생성일</TH>
        </TR>
      </THead>
      <TBody>
        <TR>
          <TD style={{ fontWeight: 500 }}>kurl.me/spring</TD>
          <TD>1,284</TD>
          <TD style={{ color: "#64748b" }}>6월 2일</TD>
        </TR>
        <TR>
          <TD style={{ fontWeight: 500 }}>kurl.me/launch</TD>
          <TD>867</TD>
          <TD style={{ color: "#64748b" }}>5월 28일</TD>
        </TR>
        <TR>
          <TD style={{ fontWeight: 500 }}>kurl.me/blog-intro</TD>
          <TD>342</TD>
          <TD style={{ color: "#64748b" }}>5월 19일</TD>
        </TR>
      </TBody>
    </Table>
  </div>
);
