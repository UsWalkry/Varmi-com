$TTL    14400
@       IN      SOA     ns1.varmii.com. admin.varmii.com. (
                        2026020701      ; Serial
                        3600            ; Refresh
                        1800            ; Retry
                        1209600         ; Expire
                        86400 )         ; Negative Cache TTL

; Nameservers
@       IN      NS      ns1.varmii.com.
@       IN      NS      ns2.varmii.com.

; A Records
@       IN      A       46.1.54.105
ns1     IN      A       46.1.54.105
ns2     IN      A       46.1.54.105
mail    IN      A       46.1.54.105
www     IN      A       46.1.54.105

; MX Record
@       IN      MX      0       varmii.com.

; TXT Records - SPF
@       IN      TXT     "v=spf1 include:_spf.cenuta.com -all"

; Zoho Verification
@       IN      TXT     "zoho-verification=zb57143792.zmverify.zoho.eu"

; DKIM (parcalara ayrildi)
mail._domainkey IN TXT  ( "v=DKIM1; h=sha256; k=rsa; "
                          "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxtRXQkE9yFFz9zn/8pzQbGkQp8JugBUr0J3B/sEZqT1FcoKDIti4PimQSjrPtHJ50lxjfXoMi8pshtWWqBS53BlJHdOQk3E5SGyJb4/1GCmH1GCCzBQ5g8Xs2KG54kk6KFuDk8AOHQ/BLi+Z6HmCvhYp+N188wdGhbDGsZxXtjaThrzCh1QliSQ"
                          "jFE9C9qoPG51SPX2e8l6cyNSIpCQnlRLAJd14Tbh1/H85/vo4Lrfq653T7lQnqdBQA/GnLO/cDydeCFV9ifxIg0AKg3Z/yKaAsETVmFeIyMeMHmjUYadC3lypj0OaDop+xYUJIvlK45pi/YcEeGSocIKHvKcEvwIDAQAB" )

; DMARC
_dmarc  IN      TXT     "v=DMARC1; p=none;"

; Wildcard
*       IN      A       46.1.54.105
